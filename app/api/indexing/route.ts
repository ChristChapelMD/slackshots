import { NextRequest, NextResponse } from "next/server";

import {
  AuthorizationError,
  requireWorkspaceAccess,
} from "@/services/api/auth/workspace-access";
import {
  createBackfillRequest,
  getIndexingStatus,
  retryFailedIndexingJobs,
  setIndexingPaused,
} from "@/services/indexing/indexing-queue";

export const runtime = "nodejs";

type IndexingAction =
  | "enqueue_recent"
  | "enqueue_all"
  | "pause"
  | "resume"
  | "retry_failed";

export async function GET(request: NextRequest) {
  try {
    const { workspace } = await requireWorkspaceAccess(request, false);
    const status = await getIndexingStatus(workspace._id);

    return NextResponse.json({ status });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, workspace } = await requireWorkspaceAccess(request, false);
    const body = (await request.json().catch(() => null)) as {
      action?: IndexingAction;
      limit?: number;
    } | null;

    if (!body?.action) {
      return NextResponse.json(
        { error: "An indexing action is required." },
        { status: 400 },
      );
    }

    switch (body.action) {
      case "enqueue_recent": {
        const limit = Math.min(500, Math.max(1, Math.floor(body.limit ?? 100)));

        await createBackfillRequest(workspace._id, {
          limit,
          newestFirst: true,
          requestedBy: session.user.id,
        });
        break;
      }
      case "enqueue_all":
        await createBackfillRequest(workspace._id, {
          requestedBy: session.user.id,
        });
        break;
      case "pause":
        await setIndexingPaused(workspace._id, true);
        break;
      case "resume":
        await setIndexingPaused(workspace._id, false);
        break;
      case "retry_failed":
        await retryFailedIndexingJobs(workspace._id);
        break;
      default:
        return NextResponse.json(
          { error: "Unsupported indexing action." },
          { status: 400 },
        );
    }

    const status = await getIndexingStatus(workspace._id);

    return NextResponse.json({ status });
  } catch (error) {
    return handleError(error);
  }
}

function handleError(error: unknown) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  console.error("[Indexing API] Error:", error);

  return NextResponse.json(
    { error: "Indexing controls are temporarily unavailable." },
    { status: 500 },
  );
}
