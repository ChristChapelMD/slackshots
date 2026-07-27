import { NextResponse } from "next/server";

import {
  AuthorizationError,
  requireSession,
  requireWorkspaceAccess,
} from "@/services/api/auth/workspace-access";
import { getDefaultWorkspace } from "@/services/api/db/operations/workspace.operation";

export async function GET(request: Request) {
  try {
    await requireSession(request);
    const installedWorkspace = await getDefaultWorkspace(false);

    if (!installedWorkspace) {
      return NextResponse.json({ workspace: null });
    }

    const { workspace } = await requireWorkspaceAccess(request, false);

    return NextResponse.json({ workspace });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    console.error(err);

    return NextResponse.json(
      { error: "Failed to fetch current workspace" },
      { status: 500 },
    );
  }
}
