import mongoose, { Document, Schema } from "mongoose";

export interface IndexingControlDTO {
  workspaceId: mongoose.Types.ObjectId;
  isPaused: boolean;
  workerId?: string;
  workerHeartbeatAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface IIndexingControl extends IndexingControlDTO, Document {}

const IndexingControlSchema = new Schema<IIndexingControl>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      unique: true,
      index: true,
    },
    isPaused: { type: Boolean, default: false },
    workerId: { type: String },
    workerHeartbeatAt: { type: Date },
  },
  {
    collection: "indexing_controls",
    timestamps: true,
  },
);

export const IndexingControl =
  mongoose.models.IndexingControl ||
  mongoose.model<IIndexingControl>("IndexingControl", IndexingControlSchema);
