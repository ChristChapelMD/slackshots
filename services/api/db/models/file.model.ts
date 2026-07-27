import mongoose, { Schema, Document } from "mongoose";

export enum FileRecordStatus {
  PENDING = "PENDING",
  UPLOADED = "UPLOADED",
  FAILED = "FAILED",
}

export interface FileRecordDTO {
  fileName: string;
  fileSize: number;
  uploadSessionId: string;
  userId?: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  fileType: string;
  status: FileRecordStatus;
  uploadedBy?: {
    userId: string;
    name: string;
    email?: string;
    image?: string;
  };
  uploads: {
    provider: string;
    providerFileId: string;
    providerFileUrl: string;
    providerThumbnailUrl?: string;
  }[];
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface IFileRecord extends FileRecordDTO, Document {}

const FileRecordSchema = new Schema<IFileRecord>(
  {
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    uploadSessionId: { type: String, required: true, index: true },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    fileType: { type: String, required: true },
    uploadedBy: {
      userId: { type: String },
      name: { type: String },
      email: { type: String },
      image: { type: String },
    },
    status: {
      type: String,
      enum: Object.values(FileRecordStatus),
      default: FileRecordStatus.UPLOADED,
      required: true,
    },
    uploads: [
      {
        provider: { type: String, required: true, enum: ["slack"] },
        providerFileId: { type: String, required: true },
        providerFileUrl: { type: String, required: true },
        providerThumbnailUrl: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    errorMessage: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

FileRecordSchema.index({
  workspaceId: 1,
  status: 1,
  createdAt: -1,
  _id: -1,
});
FileRecordSchema.index({
  workspaceId: 1,
  fileType: 1,
  status: 1,
  createdAt: -1,
  _id: -1,
});
FileRecordSchema.index(
  { workspaceId: 1, "uploads.providerFileId": 1 },
  { sparse: true },
);
FileRecordSchema.index({ uploadSessionId: 1, status: 1 });

export const File =
  mongoose.models.File || mongoose.model<IFileRecord>("File", FileRecordSchema);
