import type { TextEmbedder } from "@/services/embeddings/image-embedder";
import type { ImageVectorIndex } from "./vector-index";

import mongoose from "mongoose";

import {
  File,
  FileRecordStatus,
  type FileRecordDTO,
} from "@/services/api/db/models/file.model";
import dbConnect from "@/services/api/db/connection";

export interface SemanticSearchResult {
  backend: "atlas" | "exact";
  files: Array<
    FileRecordDTO & {
      _id: mongoose.Types.ObjectId;
      score: number;
    }
  >;
}

export async function searchImages(
  {
    workspaceId,
    query,
    limit,
  }: {
    workspaceId: mongoose.Types.ObjectId;
    query: string;
    limit: number;
  },
  textEmbedder: TextEmbedder,
  vectorIndex: ImageVectorIndex,
): Promise<SemanticSearchResult> {
  await dbConnect();

  const [queryVector] = await textEmbedder.embedTexts([
    buildEmbeddingQuery(query),
  ]);

  if (!queryVector?.length) {
    throw new Error("The query did not produce an embedding.");
  }

  const vectorResult = await vectorIndex.searchImages({
    workspaceId,
    queryVector,
    limit,
  });
  const fileIds = vectorResult.matches.map((match) => match.fileRecordId);

  if (fileIds.length === 0) {
    return { backend: vectorResult.backend, files: [] };
  }

  const records = await File.find({
    _id: { $in: fileIds },
    workspaceId,
    status: FileRecordStatus.UPLOADED,
  })
    .select({
      fileName: 1,
      fileSize: 1,
      fileType: 1,
      uploadedBy: 1,
      uploads: 1,
      metadata: 1,
      createdAt: 1,
    })
    .lean<Array<FileRecordDTO & { _id: mongoose.Types.ObjectId }>>();
  const filesById = new Map(
    records.map((record) => [record._id.toString(), record]),
  );

  return {
    backend: vectorResult.backend,
    files: vectorResult.matches.flatMap((match) => {
      const file = filesById.get(match.fileRecordId.toString());

      return file ? [{ ...file, score: match.score }] : [];
    }),
  };
}

export function buildEmbeddingQuery(query: string): string {
  const normalized = query.trim().replace(/\s+/g, " ");
  const words = normalized.split(" ");

  if (words.length > 2) return normalized;

  const subject = normalized.replace(/^(?:a|an|the)\s+/i, "");

  return `a photo primarily showing ${subject}`;
}
