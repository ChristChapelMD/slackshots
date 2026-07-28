import { loadEnvConfig } from "@next/env";
import type { DataType } from "@huggingface/transformers";
import mongoose from "mongoose";

import { File, FileRecordStatus } from "@/services/api/db/models/file.model";
import { getDefaultWorkspace } from "@/services/api/db/operations/workspace.operation";
import {
  fetchFile,
  getFileMetadata,
} from "@/services/api/integrations/slack/files";
import {
  DEFAULT_IMAGE_EMBEDDING_DTYPE,
  DEFAULT_IMAGE_EMBEDDING_MODEL,
  DEFAULT_IMAGE_EMBEDDING_REVISION,
} from "@/services/embeddings/image-embedder";
import { TransformersClipEmbedder } from "@/services/embeddings/transformers-clip-embedder";

loadEnvConfig(process.cwd());

const DEFAULT_QUERIES = [
  "a group of people posing together",
  "a screenshot of a website or application",
  "a person standing outdoors",
  "food on a table",
];

interface BenchmarkOptions {
  limit: number;
  modelId: string;
  revision: string;
  dtype: DataType;
  queries: string[];
}

interface EmbeddedFile {
  fileName: string;
  providerFileId: string;
  vector: number[];
  durationMs: number;
}

interface BenchmarkFileRecord {
  fileName: string;
  uploads: {
    providerFileId: string;
    providerFileUrl: string;
    providerThumbnailUrl?: string;
  }[];
}

function readOption(name: string): string | undefined {
  const equalsPrefix = `--${name}=`;
  const equalsValue = process.argv.find((argument) =>
    argument.startsWith(equalsPrefix),
  );

  if (equalsValue) {
    return equalsValue.slice(equalsPrefix.length);
  }

  const optionIndex = process.argv.indexOf(`--${name}`);

  if (optionIndex === -1) {
    return undefined;
  }

  return process.argv.at(optionIndex + 1);
}

function getOptions(): BenchmarkOptions {
  const limit = Number.parseInt(readOption("limit") ?? "25", 10);
  const queryOption = readOption("queries");
  const dtype = readOption("dtype") ?? DEFAULT_IMAGE_EMBEDDING_DTYPE;
  const supportedDtypes = new Set<DataType>([
    "auto",
    "fp32",
    "fp16",
    "q8",
    "int8",
    "uint8",
    "q4",
    "bnb4",
    "q4f16",
    "q2",
    "q2f16",
    "q1",
    "q1f16",
  ]);

  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    throw new Error("--limit must be an integer between 1 and 500.");
  }
  if (!supportedDtypes.has(dtype as DataType)) {
    throw new Error(`Unsupported --dtype value: ${dtype}.`);
  }

  return {
    limit,
    modelId: readOption("model") ?? DEFAULT_IMAGE_EMBEDDING_MODEL,
    revision: readOption("revision") ?? DEFAULT_IMAGE_EMBEDDING_REVISION,
    dtype: dtype as DataType,
    queries: queryOption
      ? queryOption
          .split("|")
          .map((query) => query.trim())
          .filter(Boolean)
      : DEFAULT_QUERIES,
  };
}

function dotProduct(left: number[], right: number[]): number {
  if (left.length !== right.length) {
    throw new Error("Cannot compare embeddings with different dimensions.");
  }

  return left.reduce((score, value, index) => score + value * right[index], 0);
}

async function downloadImage(
  record: BenchmarkFileRecord,
  botToken: string,
): Promise<Blob> {
  const upload = record.uploads.find(
    (candidate) => candidate.providerFileId && candidate.providerFileUrl,
  );

  if (!upload) {
    throw new Error("No Slack upload is linked to this file record.");
  }

  const preferredUrl = upload.providerThumbnailUrl || upload.providerFileUrl;

  try {
    return await (await fetchFile(preferredUrl, botToken)).blob();
  } catch {
    const refreshed = await getFileMetadata(upload.providerFileId, botToken);
    const refreshedUrl =
      refreshed.providerThumbnailUrl || refreshed.providerFileUrl;

    if (!refreshedUrl) {
      throw new Error("Slack did not return a usable image URL.");
    }

    return (await fetchFile(refreshedUrl, botToken)).blob();
  }
}

function formatMegabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function main() {
  const options = getOptions();
  const workspace = await getDefaultWorkspace(true);

  if (!workspace?._id || !workspace.botToken) {
    throw new Error(
      "No Slack workspace with a bot token is available for benchmarking.",
    );
  }

  const records = await File.find({
    workspaceId: workspace._id,
    status: FileRecordStatus.UPLOADED,
    fileType: /^image\//,
    "uploads.0": { $exists: true },
  })
    .sort({ createdAt: -1 })
    .limit(options.limit)
    .select({ fileName: 1, uploads: 1 })
    .lean<BenchmarkFileRecord[]>();

  if (records.length === 0) {
    throw new Error("No uploaded image records were found to benchmark.");
  }

  const embedder = new TransformersClipEmbedder({
    modelId: options.modelId,
    revision: options.revision,
    dtype: options.dtype,
  });
  const embeddedFiles: EmbeddedFile[] = [];
  const failures: { fileName: string; message: string }[] = [];
  const initialRss = process.memoryUsage().rss;

  console.log(
    `Benchmarking ${records.length} Slack image(s) with ${options.modelId}@${options.revision} (${options.dtype}).`,
  );

  try {
    for (const [index, record] of records.entries()) {
      const startedAt = performance.now();

      try {
        const image = await downloadImage(record, workspace.botToken as string);
        const vector = await embedder.embedImage(image);
        const durationMs = performance.now() - startedAt;
        const providerFileId = record.uploads[0]?.providerFileId;

        if (!providerFileId) {
          throw new Error("The file has no Slack file ID.");
        }

        embeddedFiles.push({
          fileName: record.fileName,
          providerFileId,
          vector,
          durationMs,
        });
        console.log(
          `[${index + 1}/${records.length}] ${record.fileName}: ${durationMs.toFixed(0)} ms`,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown indexing error";
        failures.push({ fileName: record.fileName, message });
        console.warn(
          `[${index + 1}/${records.length}] ${record.fileName}: failed (${message})`,
        );
      }
    }

    if (embeddedFiles.length === 0) {
      throw new Error("Every image failed to embed.");
    }

    const textEmbeddings = await embedder.embedTexts(options.queries);

    console.log("\nRetrieval samples (human quality check):");
    for (const [queryIndex, query] of options.queries.entries()) {
      const ranked = embeddedFiles
        .map((file) => ({
          fileName: file.fileName,
          providerFileId: file.providerFileId,
          score: dotProduct(textEmbeddings[queryIndex], file.vector),
        }))
        .sort((left, right) => right.score - left.score)
        .slice(0, 5);

      console.log(`\n"${query}"`);
      ranked.forEach((result, index) => {
        console.log(
          `  ${index + 1}. ${result.fileName} (${result.score.toFixed(4)}, Slack ID ${result.providerFileId})`,
        );
      });
    }

    const durations = embeddedFiles.map((file) => file.durationMs);
    const totalDuration = durations.reduce(
      (total, duration) => total + duration,
      0,
    );
    const finalRss = process.memoryUsage().rss;

    console.log("\nBenchmark summary:");
    console.log(`  Successful: ${embeddedFiles.length}/${records.length}`);
    console.log(`  Dimensions: ${embedder.descriptor.dimensions}`);
    console.log(
      `  Mean image time: ${(totalDuration / durations.length).toFixed(0)} ms`,
    );
    console.log(
      `  Throughput: ${(embeddedFiles.length / (totalDuration / 1000)).toFixed(2)} images/second`,
    );
    console.log(`  RSS before: ${formatMegabytes(initialRss)}`);
    console.log(`  RSS after: ${formatMegabytes(finalRss)}`);
    console.log(`  RSS increase: ${formatMegabytes(finalRss - initialRss)}`);
    console.log(`  Failed: ${failures.length}`);
  } finally {
    await embedder.dispose();
    await mongoose.disconnect();
  }
}

main().catch(async (error) => {
  console.error(
    error instanceof Error ? error.message : "Embedding benchmark failed.",
  );
  await mongoose.disconnect();
  process.exitCode = 1;
});
