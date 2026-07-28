import os from "node:os";
import { randomUUID } from "node:crypto";

import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";

import { getDefaultWorkspace } from "@/services/api/db/operations/workspace.operation";
import { TransformersClipEmbedder } from "@/services/embeddings/transformers-clip-embedder";
import { startTextEmbeddingServer } from "@/services/embeddings/text-embedding-server";
import { IndexingService } from "@/services/indexing/indexing-service";
import {
  enqueueAllExistingImages,
  processNextBackfillRequest,
  recordWorkerHeartbeat,
} from "@/services/indexing/indexing-queue";

loadEnvConfig(process.cwd());

type Command = "enqueue" | "worker" | "all";

const command = process.argv[2] as Command | undefined;
const workerId = `${os.hostname()}:${process.pid}:${randomUUID().slice(0, 8)}`;
let stopping = false;

function stop() {
  stopping = true;
}

process.once("SIGINT", stop);
process.once("SIGTERM", stop);

function readNumberOption(name: string, fallback: number): number {
  const prefix = `--${name}=`;
  const raw = process.argv.find((argument) => argument.startsWith(prefix));
  const value = Number.parseInt(raw?.slice(prefix.length) ?? `${fallback}`, 10);

  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`--${name} must be a non-negative integer.`);
  }

  return value;
}

async function enqueue() {
  const workspace = await getDefaultWorkspace();

  if (!workspace?._id) {
    throw new Error("No configured Slack workspace was found.");
  }

  const result = await enqueueAllExistingImages(workspace._id, {
    force: process.argv.includes("--force"),
    limit: readNumberOption("limit", 0) || undefined,
    newestFirst: process.argv.includes("--newest"),
  });

  console.log(
    `Scanned ${result.scanned}; queued ${result.enqueued}; already complete ${result.alreadyComplete}; skipped ${result.skipped}.`,
  );

  return workspace._id;
}

async function work({
  embedder,
  workspaceId,
  exitWhenIdle,
}: {
  embedder: TransformersClipEmbedder;
  workspaceId?: mongoose.Types.ObjectId;
  exitWhenIdle: boolean;
}) {
  const pollMs = readNumberOption("poll-ms", 2_000);
  const service = new IndexingService(embedder, {
    workerId,
    workspaceId,
  });
  let succeeded = 0;
  let failed = 0;

  while (!stopping) {
    await recordWorkerHeartbeat(workerId, workspaceId);

    const backfill = await processNextBackfillRequest({
      workerId,
      workspaceId,
    });

    if (backfill.processed) {
      if (backfill.succeeded && backfill.result) {
        console.log(
          `Backfill prepared ${backfill.result.enqueued} job(s); ${backfill.result.alreadyComplete} already complete.`,
        );
      } else {
        console.warn("A backfill request failed.");
      }
      continue;
    }

    const result = await service.processNextJob();

    if (!result.processed) {
      if (exitWhenIdle) break;
      await new Promise((resolve) => setTimeout(resolve, pollMs));
      continue;
    }

    if (result.succeeded) {
      succeeded += 1;
      console.log(
        `[${succeeded} complete, ${failed} deferred/failed] Indexed ${result.fileRecordId}.`,
      );
    } else {
      failed += 1;
      console.warn(
        `[${succeeded} complete, ${failed} deferred/failed] ${result.fileRecordId}: ${result.errorCode}.`,
      );
    }
  }

  console.log(
    `Indexer stopped. Completed ${succeeded}; deferred/failed ${failed}.`,
  );
}

async function main() {
  if (!command || !["enqueue", "worker", "all"].includes(command)) {
    throw new Error(
      "Choose a command: enqueue, worker, or all. Example: npm run index:all",
    );
  }

  if (command === "enqueue") {
    await enqueue();
    return;
  }

  if (command === "all") {
    const workspaceId = await enqueue();
    const embedder = new TransformersClipEmbedder();

    try {
      await work({ embedder, workspaceId, exitWhenIdle: true });
    } finally {
      await embedder.dispose();
    }
    return;
  }

  const embedder = new TransformersClipEmbedder();
  const server = await startTextEmbeddingServer(embedder, {
    host: process.env.EMBEDDING_SERVICE_HOST ?? "127.0.0.1",
    port: readNumberOption(
      "embedding-port",
      Number.parseInt(process.env.EMBEDDING_SERVICE_PORT ?? "3001", 10),
    ),
    token: process.env.EMBEDDING_SERVICE_TOKEN,
  });

  console.log("Text embedding service listening.");

  try {
    await work({ embedder, exitWhenIdle: false });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await embedder.dispose();
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Indexer failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
