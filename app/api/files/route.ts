import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import mongoose from "mongoose";

import { auth } from "@/lib/auth";
import { api } from "@/services/api";

const DEFAULT_LIMIT = 16;
const MAX_LIMIT = 50;

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const lastWorkspaceId = cookieStore.get("lastWorkspaceId")?.value;

    if (!lastWorkspaceId) {
      return NextResponse.json(
        { error: "No workspace selected or linked" },
        { status: 400 },
      );
    }

    const searchParams = new URL(request.url).searchParams;
    const page = Math.max(
      1,
      parseInt(searchParams.get("page") ?? "1", 10) || 1,
    );
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

    const workspace = await api.db.workspace.getWorkspaceBySlackId(
      lastWorkspaceId,
      false,
    );

    const relation = await api.db.userworkspace.getUserWorkspaceRelation(
      session.user.id,
      workspace.workspaceId,
    );

    if (!relation) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { files, total } = await api.db.file.getFilesForUser(
      api.db.utils.toObjectId(session.user.id),
      workspace._id,
      page,
      limit,
      fileTypes,
    );

    const hasMore = page * limit < total;

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
      })),
      page,
      limit,
      total,
      hasMore,
    });
  } catch (error) {
    console.error("[List Files API] Error:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const lastWorkspaceId = cookieStore.get("lastWorkspaceId")?.value;

    if (!lastWorkspaceId) {
      return NextResponse.json(
        { error: "No workspace selected or linked" },
        { status: 400 },
      );
    }

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

    const workspace = await api.db.workspace.getWorkspaceBySlackId(
      lastWorkspaceId,
      true,
    );

    const relation = await api.db.userworkspace.getUserWorkspaceRelation(
      session.user.id,
      workspace.workspaceId,
    );

    if (!relation) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const validIds = files
      .map((file) => {
        try {
          return api.db.utils.toObjectId(file.fileId);
        } catch {
          return null;
        }
      })
      .filter(
        (id): id is mongoose.Types.ObjectId => id !== null && id !== undefined,
      );

    if (!validIds.length) {
      return NextResponse.json(
        { error: "No valid file IDs provided" },
        { status: 400 },
      );
    }

    const deletedCount = await api.db.file.deleteFilesForUserWorkspace(
      validIds,
      api.db.utils.toObjectId(session.user.id),
      workspace._id,
    );

    return NextResponse.json({ deletedCount });
  } catch (error) {
    console.error("[Delete Files API] Error:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
