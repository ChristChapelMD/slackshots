import mongoose from "mongoose";

import { Workspace, WorkspaceDTO } from "../models/workspace.model";

import dbConnect from "@/services/api/db/connection";

export async function createOrUpdateWorkspace(
  data: WorkspaceDTO,
): Promise<WorkspaceDTO | null> {
  await dbConnect();

  try {
    const workspace = await Workspace.findOneAndUpdate(
      { workspaceId: data.workspaceId },
      { $set: data },
      { new: true, upsert: true },
    ).lean<WorkspaceDTO & { _id: mongoose.Types.ObjectId }>();

    if (!workspace) {
      return null;
    }

    return workspace;
  } catch (error) {
    console.error("Failed to create or update workspace:", error);
    throw new Error("Workspace creation/update failed");
  }
}

export async function getDefaultWorkspace(
  includeSensitive: boolean = false,
): Promise<(Partial<WorkspaceDTO> & { _id: mongoose.Types.ObjectId }) | null> {
  await dbConnect();

  try {
    const projection = includeSensitive ? {} : { botToken: 0 };

    const configuredWorkspaceId = process.env.SLACK_WORKSPACE_ID;
    const filter = configuredWorkspaceId
      ? { workspaceId: configuredWorkspaceId }
      : {};

    return await Workspace.findOne(filter, projection)
      .sort({ updatedAt: -1 })
      .lean<WorkspaceDTO & { _id: mongoose.Types.ObjectId }>();
  } catch (error) {
    console.error("Failed to get default workspace:", error);
    throw new Error("Workspace retrieval failed");
  }
}

export async function getWorkspaceBySlackId(
  workspaceId: string,
  includeSensitive: boolean = false,
): Promise<(Partial<WorkspaceDTO> & { _id: mongoose.Types.ObjectId }) | null> {
  await dbConnect();

  const projection = includeSensitive ? {} : { botToken: 0 };

  return Workspace.findOne({ workspaceId }, projection).lean<
    WorkspaceDTO & { _id: mongoose.Types.ObjectId }
  >();
}
