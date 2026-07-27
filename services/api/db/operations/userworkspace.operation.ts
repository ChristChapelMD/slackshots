import {
  UserWorkspace,
  UserWorkspaceDTO,
  WorkspaceRole,
} from "../models/userworkspace.model";

import dbConnect from "@/services/api/db/connection";

export async function getUserWorkspaceRelation(
  userId: string,
  workspaceId: string,
): Promise<UserWorkspaceDTO | null> {
  await dbConnect();

  return UserWorkspace.findOne({
    userId,
    workspaceId,
  }).lean<UserWorkspaceDTO>();
}

export async function createOrUpdateUserWorkspaceRelation({
  userId,
  workspaceId,
  slackUserId,
  role = "member",
}: {
  userId: string;
  workspaceId: string;
  slackUserId: string;
  role?: WorkspaceRole;
}): Promise<UserWorkspaceDTO | null> {
  await dbConnect();

  return UserWorkspace.findOneAndUpdate(
    { userId, workspaceId },
    {
      $set: {
        slackUserId,
        role,
        verifiedAt: new Date(),
      },
      $setOnInsert: { userId, workspaceId },
    },
    { new: true, upsert: true },
  ).lean<UserWorkspaceDTO>();
}
