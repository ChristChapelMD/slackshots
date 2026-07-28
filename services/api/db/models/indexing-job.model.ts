import mongoose, { Document, Schema } from "mongoose";

export enum IndexingJobKind {
  IMAGE_EMBEDDING = "IMAGE_EMBEDDING",
}

export enum IndexingJobStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETE = "COMPLETE",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export interface IndexingJobDTO {
  workspaceId: mongoose.Types.ObjectId;
  fileRecordId: mongoose.Types.ObjectId;
  imageIndexId: mongoose.Types.ObjectId;
  kind: IndexingJobKind;
  indexVersion: string;
  status: IndexingJobStatus;
  priority: number;
  attempts: number;
  maxAttempts: number;
  availableAt: Date;
  leaseOwner?: string;
  leaseExpiresAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  errorCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface IIndexingJob extends IndexingJobDTO, Document {}

const IndexingJobSchema = new Schema<IIndexingJob>(
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
    imageIndexId: {
      type: Schema.Types.ObjectId,
      ref: "ImageIndex",
      required: true,
      index: true,
    },
    kind: {
      type: String,
      enum: Object.values(IndexingJobKind),
      required: true,
    },
    indexVersion: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(IndexingJobStatus),
      default: IndexingJobStatus.PENDING,
      required: true,
    },
    priority: { type: Number, default: 0 },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    availableAt: { type: Date, default: Date.now },
    leaseOwner: { type: String },
    leaseExpiresAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    errorCode: { type: String },
  },
  {
    collection: "indexing_jobs",
    timestamps: true,
  },
);

IndexingJobSchema.index(
  { workspaceId: 1, fileRecordId: 1, kind: 1, indexVersion: 1 },
  { unique: true },
);
IndexingJobSchema.index({
  status: 1,
  availableAt: 1,
  priority: -1,
  createdAt: 1,
});
IndexingJobSchema.index({ status: 1, leaseExpiresAt: 1 });

export const IndexingJob =
  mongoose.models.IndexingJob ||
  mongoose.model<IIndexingJob>("IndexingJob", IndexingJobSchema);
