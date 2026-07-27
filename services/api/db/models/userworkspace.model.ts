import mongoose, { Document, Schema } from "mongoose";

export type WorkspaceRole = "owner" | "member";

export interface UserWorkspaceDTO {
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
  slackUserId: string;
  verifiedAt: Date;
}

interface IUserWorkspace extends UserWorkspaceDTO, Document {}

const UserWorkspaceSchema = new Schema<IUserWorkspace>(
  {
    userId: { type: String, required: true },
    workspaceId: { type: String, required: true },
    role: {
      type: String,
      enum: ["owner", "member"],
      default: "member",
      required: true,
    },
    slackUserId: { type: String, required: true },
    verifiedAt: { type: Date, default: Date.now, required: true },
  },
  { timestamps: true },
);

UserWorkspaceSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

export const UserWorkspace =
  mongoose.models.UserWorkspace ||
  mongoose.model<IUserWorkspace>("UserWorkspace", UserWorkspaceSchema);
