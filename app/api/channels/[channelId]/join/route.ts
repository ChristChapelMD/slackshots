import { NextResponse } from "next/server";

import {
  AuthorizationError,
  requireWorkspaceAccess,
} from "@/services/api/auth/workspace-access";
import { joinChannel } from "@/services/api/integrations/slack/channels";

export async function POST(
  request: Request,
  context: { params: Promise<{ channelId: string }> },
) {
  try {
    const { workspace } = await requireWorkspaceAccess(request, true);
    const { channelId } = await context.params;

    if (!channelId) {
      return NextResponse.json(
        { error: "Channel ID is required" },
        { status: 400 },
      );
    }

    await joinChannel(workspace.botToken as string, channelId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to join channel",
      },
      { status: 500 },
    );
  }
}
