import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { SlackOAuthResponse } from "@/types/slack";
import {
  AuthorizationError,
  requireSession,
} from "@/services/api/auth/workspace-access";
import { createOrUpdateWorkspace } from "@/services/api/db/operations/workspace.operation";
import { createOrUpdateUserWorkspaceRelation } from "@/services/api/db/operations/userworkspace.operation";
import { findWorkspaceMemberByEmail } from "@/services/api/integrations/slack/channels";

export async function GET(request: Request) {
  const appBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    new URL(request.url).origin;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const storedState = cookieStore.get("slack_oauth_state")?.value;
  let session;

  try {
    session = await requireSession(request);
  } catch {
    const response = NextResponse.redirect(new URL("/sign-in", appBaseUrl));

    response.cookies.delete("slack_oauth_state");

    return response;
  }

  const expectedState = `${session.user.id}:${state}`;

  if (!code || !state || !storedState || expectedState !== storedState) {
    const invalidStateResponse = NextResponse.redirect(
      new URL("/error?message=invalid_oauth_state", appBaseUrl),
    );

    invalidStateResponse.cookies.delete("slack_oauth_state");

    return invalidStateResponse;
  }

  try {
    const slackOauthResponse = await fetch(
      "https://slack.com/api/oauth.v2.access",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.SLACK_CLIENT_ID!,
          client_secret: process.env.SLACK_CLIENT_SECRET!,
          code,
          redirect_uri: process.env.SLACK_OAUTH2_V2_REDIRECT_URI!,
        }),
      },
    );

    const data: SlackOAuthResponse = await slackOauthResponse.json();

    if (!data.ok) {
      console.error("Slack OAuth error response:", data);
      throw new Error(data.error || "Slack OAuth exchange failed");
    }

    if (!session.user.email) {
      throw new AuthorizationError(
        "Your Slack profile must expose an email address",
        403,
      );
    }

    const slackMember = await findWorkspaceMemberByEmail(
      data.access_token,
      session.user.email,
    );

    if (!slackMember || slackMember.teamId !== data.team.id) {
      throw new AuthorizationError(
        "Sign in with an account that belongs to the installed workspace",
        403,
      );
    }

    await createOrUpdateWorkspace({
      workspaceId: data.team.id,
      workspaceName: data.team.name,
      botToken: data.access_token,
      botUserId: data.bot_user_id,
      scope: data.scope,
      enterpriseId: data.enterprise?.id,
      enterpriseName: data.enterprise?.name,
    });
    await createOrUpdateUserWorkspaceRelation({
      userId: session.user.id,
      workspaceId: data.team.id,
      slackUserId: slackMember.id,
      role: "owner",
    });

    const redirectUrl = new URL("/dashboard", appBaseUrl);

    redirectUrl.searchParams.set("success", "true");

    const response = NextResponse.redirect(redirectUrl);

    response.cookies.delete("slack_oauth_state");

    return response;
  } catch (err) {
    console.error("Slack OAuth error:", err);
    const errorCode =
      err instanceof Error ? encodeURIComponent(err.message) : "oauth_failed";

    const errorResponse = NextResponse.redirect(
      new URL(`/error?message=${errorCode}`, appBaseUrl),
    );

    errorResponse.cookies.delete("slack_oauth_state");

    return errorResponse;
  }
}
