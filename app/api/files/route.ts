import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import {
  AuthorizationError,
  requireWorkspaceAccess,
} from "@/services/api/auth/workspace-access";
import {
  deleteFilesForWorkspace,
  getFilesByIdsForWorkspace,
  getFilesForWorkspace,
} from "@/services/api/db/operations/file.operation";
import { toObjectId } from "@/services/api/db/utils";
import { deleteFile as deleteSlackFile } from "@/services/api/integrations/slack/files";

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 50;

export async function GET(request: NextRequest) {
  try {
    const { workspace } = await requireWorkspaceAccess(request, false);

    const searchParams = new URL(request.url).searchParams;
    const cursor = searchParams.get("cursor");
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(
        1,
        parseInt(searchParams.get("limit") ?? `${DEFAULT_LIMIT}`, 10) ||
          DEFAULT_LIMIT,
      ),
    );
    const fileTypesParam = searchParams.get("fileTypes");
    const fileTypes = fileTypesParam
      ? fileTypesParam
          .split(",")
          .map((type) => type.trim())
          .filter(Boolean)
      : undefined;

    const { files, nextCursor } = await getFilesForWorkspace(
      workspace._id,
      limit,
      fileTypes,
      cursor,
    );

    return NextResponse.json({
      files: files.map((fileRecord) => ({
        _id: fileRecord._id,
        fileName: fileRecord.fileName,
        fileSize: fileRecord.fileSize,
        fileType: fileRecord.fileType,
        uploads: fileRecord.uploads.map((upload: any) => ({
          provider: upload.provider,
          providerFileId: upload.providerFileId,
        })),
        uploadedBy: fileRecord.uploadedBy,
        metadata: fileRecord.metadata,
        createdAt: fileRecord.createdAt,
      })),
      limit,
      nextCursor,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    if (
      error instanceof Error &&
      error.message === "Invalid pagination cursor"
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("[List Files API] Error:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { workspace } = await requireWorkspaceAccess(request, true);

    const body = await request.json().catch(() => null);
    const files = body?.files as
      | { fileId: string; deleteFlag: "app" | "both" }[]
      | undefined;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided for deletion" },
        { status: 400 },
      );
    }

    const validFiles = files
      .map((file) => {
        try {
          return { ...file, objectId: toObjectId(file.fileId) };
        } catch {
          return null;
        }
      })
      .filter(
        (
          file,
        ): file is {
          fileId: string;
          deleteFlag: "app" | "both";
          objectId: mongoose.Types.ObjectId;
        } => file !== null,
      );

    if (!validFiles.length) {
      return NextResponse.json(
        { error: "No valid file IDs provided" },
        { status: 400 },
      );
    }

    const validIds = validFiles.map((file) => file.objectId);
    const records = await getFilesByIdsForWorkspace(validIds, workspace._id);
    const deleteFromSlackIds = new Set(
      validFiles
        .filter((file) => file.deleteFlag === "both")
        .map((file) => file.fileId),
    );

    await Promise.all(
      records
        .filter((record) => deleteFromSlackIds.has(record._id.toString()))
        .flatMap((record) =>
          record.uploads
            .filter((upload) => upload.provider === "slack")
            .map((upload) =>
              deleteSlackFile(upload.providerFileId, workspace.botToken),
            ),
        ),
    );

    const deletedCount = await deleteFilesForWorkspace(validIds, workspace._id);

    return NextResponse.json({ deletedCount });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("[Delete Files API] Error:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
