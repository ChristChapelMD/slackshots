import { NextResponse } from "next/server";

import {
  AuthorizationError,
  requireWorkspaceAccess,
} from "@/services/api/auth/workspace-access";
import { getChannels } from "@/services/api/integrations/slack/channels";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireWorkspaceAccess(request, true);

    const channels = await getChannels(workspace.botToken as string);

    return NextResponse.json({ channels });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("[Channels API] Error:", error);

    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
