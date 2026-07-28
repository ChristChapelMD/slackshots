import mongoose, { Document, Schema } from "mongoose";

export enum ImageIndexStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETE = "COMPLETE",
  FAILED = "FAILED",
  STALE = "STALE",
}

export interface ImageIndexDTO {
  workspaceId: mongoose.Types.ObjectId;
  fileRecordId: mongoose.Types.ObjectId;
  providerFileId: string;
  indexVersion: string;
  status: ImageIndexStatus;
  embedding?: number[];
  embeddingModel: string;
  embeddingRevision: string;
  embeddingDtype: string;
  embeddingDimensions: number;
  sourceMetadata: {
    fileName: string;
    fileType: string;
    createdAt: Date;
    uploaderId?: string;
    uploaderName?: string;
    channelIds: string[];
    width?: number;
    height?: number;
  };
  caption?: string;
  ocrText?: string;
  tags: string[];
  indexedAt?: Date;
  errorCode?: string;
  processingOwner?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface IImageIndex extends ImageIndexDTO, Document {}

const ImageIndexSchema = new Schema<IImageIndex>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    fileRecordId: {
      type: Schema.Types.ObjectId,
      ref: "File",
      required: true,
      index: true,
    },
    providerFileId: { type: String, required: true },
    indexVersion: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(ImageIndexStatus),
      default: ImageIndexStatus.PENDING,
      required: true,
    },
    embedding: {
      type: [Number],
      select: false,
    },
    embeddingModel: { type: String, required: true },
    embeddingRevision: { type: String, required: true },
    embeddingDtype: { type: String, required: true },
    embeddingDimensions: { type: Number, required: true },
    sourceMetadata: {
      fileName: { type: String, required: true },
      fileType: { type: String, required: true },
      createdAt: { type: Date, required: true },
      uploaderId: { type: String },
      uploaderName: { type: String },
      channelIds: { type: [String], default: [] },
      width: { type: Number },
      height: { type: Number },
    },
    caption: { type: String },
    ocrText: { type: String },
    tags: { type: [String], default: [] },
    indexedAt: { type: Date },
    errorCode: { type: String },
    processingOwner: { type: String, select: false },
  },
  {
    collection: "image_indexes",
    timestamps: true,
  },
);

ImageIndexSchema.index(
  { workspaceId: 1, fileRecordId: 1, indexVersion: 1 },
  { unique: true },
);
ImageIndexSchema.index({
  workspaceId: 1,
  indexVersion: 1,
  status: 1,
  updatedAt: 1,
});
ImageIndexSchema.index({
  workspaceId: 1,
  providerFileId: 1,
  indexVersion: 1,
});

export const ImageIndex =
  mongoose.models.ImageIndex ||
  mongoose.model<IImageIndex>("ImageIndex", ImageIndexSchema);
