import mongoose, { Document, Schema } from "mongoose";

export enum IndexingRequestType {
  BACKFILL = "BACKFILL",
}

export enum IndexingRequestStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETE = "COMPLETE",
  FAILED = "FAILED",
}

export interface IndexingRequestDTO {
  workspaceId: mongoose.Types.ObjectId;
  type: IndexingRequestType;
  status: IndexingRequestStatus;
  limit?: number;
  newestFirst: boolean;
  force: boolean;
  requestedBy?: string;
  leaseOwner?: string;
  leaseExpiresAt?: Date;
  result?: {
    scanned: number;
    enqueued: number;
    alreadyComplete: number;
    skipped: number;
  };
  errorCode?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface IIndexingRequest extends IndexingRequestDTO, Document {}

const IndexingRequestSchema = new Schema<IIndexingRequest>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(IndexingRequestType),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(IndexingRequestStatus),
      default: IndexingRequestStatus.PENDING,
      required: true,
    },
    limit: { type: Number },
    newestFirst: { type: Boolean, default: false },
    force: { type: Boolean, default: false },
    requestedBy: { type: String },
    leaseOwner: { type: String },
    leaseExpiresAt: { type: Date },
    result: {
      scanned: { type: Number },
      enqueued: { type: Number },
      alreadyComplete: { type: Number },
      skipped: { type: Number },
    },
    errorCode: { type: String },
    completedAt: { type: Date },
  },
  {
    collection: "indexing_requests",
    timestamps: true,
  },
);

IndexingRequestSchema.index({
  status: 1,
  createdAt: 1,
  leaseExpiresAt: 1,
});

export const IndexingRequest =
  mongoose.models.IndexingRequest ||
  mongoose.model<IIndexingRequest>("IndexingRequest", IndexingRequestSchema);
