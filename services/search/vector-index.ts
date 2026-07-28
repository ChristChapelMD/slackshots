import type mongoose from "mongoose";

export interface ImageVectorMatch {
  imageIndexId: mongoose.Types.ObjectId;
  fileRecordId: mongoose.Types.ObjectId;
  score: number;
}

export interface ImageVectorSearchResult {
  backend: "atlas" | "exact";
  matches: ImageVectorMatch[];
}

export interface ImageVectorIndex {
  upsertImageEmbedding(input: {
    imageIndexId: mongoose.Types.ObjectId;
    processingOwner: string;
    embedding: number[];
  }): Promise<boolean>;

  searchImages(input: {
    workspaceId: mongoose.Types.ObjectId;
    queryVector: number[];
    limit: number;
  }): Promise<ImageVectorSearchResult>;

  deleteFileVectors(input: {
    workspaceId: mongoose.Types.ObjectId;
    fileRecordIds: mongoose.Types.ObjectId[];
  }): Promise<number>;
}
