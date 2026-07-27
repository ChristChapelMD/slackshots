import { NextResponse } from "next/server";

import { slackScopesConfig } from "@/config/scopes";
import {
  AuthorizationError,
  requireSession,
  requireWorkspaceAccess,
} from "@/services/api/auth/workspace-access";
import { getDefaultWorkspace } from "@/services/api/db/operations/workspace.operation";

export async function POST(request: Request) {
  try {
    const session = await requireSession(request);
    const installedWorkspace = await getDefaultWorkspace(false);

    if (installedWorkspace) {
      await requireWorkspaceAccess(request, false);
    }

    const state = crypto.randomUUID();
    const authorizeUrl = new URL("https://slack.com/oauth/v2/authorize");

    authorizeUrl.searchParams.set("client_id", process.env.SLACK_CLIENT_ID!);
    authorizeUrl.searchParams.set("scope", slackScopesConfig.join(","));
    authorizeUrl.searchParams.set(
      "redirect_uri",
      process.env.SLACK_OAUTH2_V2_REDIRECT_URI!,
    );
    authorizeUrl.searchParams.set("state", state);

    const response = NextResponse.json({ url: authorizeUrl.toString() });

    response.cookies.set("slack_oauth_state", `${session.user.id}:${state}`, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
    });

    return response;
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: err.status },
      );
    }

    console.error(err);

    return NextResponse.json(
      { success: false, error: "OAuth failed" },
      { status: 500 },
    );
  }
}
