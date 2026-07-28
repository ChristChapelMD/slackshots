import type { ImageVectorIndex, ImageVectorSearchResult } from "./vector-index";

import mongoose from "mongoose";

import {
  ImageIndex,
  ImageIndexStatus,
} from "@/services/api/db/models/image-index.model";
import dbConnect from "@/services/api/db/connection";
import { DEFAULT_IMAGE_EMBEDDING_VERSION } from "@/services/embeddings/image-embedder";

interface AtlasVectorResult {
  _id: mongoose.Types.ObjectId;
  fileRecordId: mongoose.Types.ObjectId;
  score: number;
}

interface ExactVectorRecord {
  _id: mongoose.Types.ObjectId;
  fileRecordId: mongoose.Types.ObjectId;
  embedding: number[];
}

export class MongoImageVectorIndex implements ImageVectorIndex {
  async upsertImageEmbedding({
    imageIndexId,
    processingOwner,
    embedding,
  }: {
    imageIndexId: mongoose.Types.ObjectId;
    processingOwner: string;
    embedding: number[];
  }): Promise<boolean> {
    await dbConnect();

    const result = await ImageIndex.updateOne(
      {
        _id: imageIndexId,
        processingOwner,
      },
      {
        $set: {
          embedding,
          embeddingDimensions: embedding.length,
          status: ImageIndexStatus.COMPLETE,
          indexedAt: new Date(),
          errorCode: null,
        },
        $unset: { processingOwner: "" },
      },
    );

    return result.modifiedCount === 1;
  }

  async searchImages({
    workspaceId,
    queryVector,
    limit,
  }: {
    workspaceId: mongoose.Types.ObjectId;
    queryVector: number[];
    limit: number;
  }): Promise<ImageVectorSearchResult> {
    await dbConnect();

    try {
      const matches = await ImageIndex.aggregate<AtlasVectorResult>([
        {
          $vectorSearch: {
            index:
              process.env.MONGO_IMAGE_VECTOR_INDEX_NAME ?? "image_semantic_v1",
            path: "embedding",
            queryVector,
            numCandidates: Math.max(100, limit * 20),
            limit,
            filter: {
              $and: [
                { workspaceId: { $eq: workspaceId } },
                {
                  indexVersion: {
                    $eq: DEFAULT_IMAGE_EMBEDDING_VERSION,
                  },
                },
                { status: { $eq: ImageIndexStatus.COMPLETE } },
              ],
            },
          },
        },
        {
          $project: {
            fileRecordId: 1,
            score: { $meta: "vectorSearchScore" },
          },
        },
      ]);

      if (matches.length === 0 && this.allowExactFallback()) {
        const hasCompletedVectors = await ImageIndex.exists({
          workspaceId,
          indexVersion: DEFAULT_IMAGE_EMBEDDING_VERSION,
          status: ImageIndexStatus.COMPLETE,
        });

        if (hasCompletedVectors) {
          return this.exactSearch(workspaceId, queryVector, limit);
        }
      }

      return {
        backend: "atlas",
        matches: matches.map((match) => ({
          imageIndexId: match._id,
          fileRecordId: match.fileRecordId,
          score: match.score,
        })),
      };
    } catch (error) {
      if (!this.allowExactFallback()) throw error;

      return this.exactSearch(workspaceId, queryVector, limit);
    }
  }

  async deleteFileVectors({
    workspaceId,
    fileRecordIds,
  }: {
    workspaceId: mongoose.Types.ObjectId;
    fileRecordIds: mongoose.Types.ObjectId[];
  }): Promise<number> {
    await dbConnect();

    if (fileRecordIds.length === 0) return 0;

    const result = await ImageIndex.deleteMany({
      workspaceId,
      fileRecordId: { $in: fileRecordIds },
    });

    return result.deletedCount;
  }

  private allowExactFallback(): boolean {
    return (
      process.env.VECTOR_SEARCH_EXACT_FALLBACK === "true" ||
      process.env.NODE_ENV !== "production"
    );
  }

  private async exactSearch(
    workspaceId: mongoose.Types.ObjectId,
    queryVector: number[],
    limit: number,
  ): Promise<ImageVectorSearchResult> {
    const records = await ImageIndex.find({
      workspaceId,
      indexVersion: DEFAULT_IMAGE_EMBEDDING_VERSION,
      status: ImageIndexStatus.COMPLETE,
    })
      .select({ fileRecordId: 1, embedding: 1 })
      .limit(5_000)
      .lean<ExactVectorRecord[]>();
    const matches = records
      .filter((record) => record.embedding?.length === queryVector.length)
      .map((record) => ({
        imageIndexId: record._id,
        fileRecordId: record.fileRecordId,
        score: record.embedding.reduce(
          (score, value, index) => score + value * queryVector[index],
          0,
        ),
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, limit);

    return { backend: "exact", matches };
  }
}
