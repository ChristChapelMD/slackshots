import type { Session, User } from "better-auth";
import type mongoose from "mongoose";
import type { UserWorkspaceDTO } from "@/services/api/db/models/userworkspace.model";
import type { WorkspaceDTO } from "@/services/api/db/models/workspace.model";

import { isLocalDevAuthBypassEnabled } from "@/lib/auth/local-dev";
import { getServerAuthSession } from "@/lib/auth/server-session";
import { getDefaultWorkspace } from "@/services/api/db/operations/workspace.operation";
import {
  createOrUpdateUserWorkspaceRelation,
  getUserWorkspaceRelation,
} from "@/services/api/db/operations/userworkspace.operation";
import { findWorkspaceMemberByEmail } from "@/services/api/integrations/slack/channels";

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export type AuthSession = {
  session: Session;
  user: User;
};

type SensitiveWorkspace = WorkspaceDTO & { _id: mongoose.Types.ObjectId };
type SafeWorkspace = Omit<SensitiveWorkspace, "botToken">;
type AuthorizedWorkspace<TWorkspace> = {
  session: AuthSession;
  workspace: TWorkspace;
  membership: UserWorkspaceDTO;
};

export async function requireSession(request: Request): Promise<AuthSession> {
  const session = await getServerAuthSession(request.headers);

  if (!session?.user) {
    throw new AuthorizationError("Unauthorized", 401);
  }

  return session;
}

export function requireWorkspaceAccess(
  request: Request,
  includeSensitive: true,
): Promise<AuthorizedWorkspace<SensitiveWorkspace>>;
export function requireWorkspaceAccess(
  request: Request,
  includeSensitive?: false,
): Promise<AuthorizedWorkspace<SafeWorkspace>>;
export async function requireWorkspaceAccess(
  request: Request,
  includeSensitive = false,
): Promise<
  AuthorizedWorkspace<SensitiveWorkspace> | AuthorizedWorkspace<SafeWorkspace>
> {
  const session = await requireSession(request);
  const workspace = await getDefaultWorkspace(true);

  if (!workspace?.workspaceId || !workspace.botToken) {
    throw new AuthorizationError("No Slack workspace is connected", 409);
  }

  if (isLocalDevAuthBypassEnabled()) {
    const membership: UserWorkspaceDTO = {
      userId: session.user.id,
      workspaceId: workspace.workspaceId,
      role: "owner",
      slackUserId: "local-dev",
      verifiedAt: new Date(),
    };
    const authorizedWorkspace = workspace as SensitiveWorkspace;

    if (includeSensitive) {
      return { session, workspace: authorizedWorkspace, membership };
    }

    const safeWorkspace: SafeWorkspace = {
      _id: authorizedWorkspace._id,
      workspaceId: authorizedWorkspace.workspaceId,
      workspaceName: authorizedWorkspace.workspaceName,
      botUserId: authorizedWorkspace.botUserId,
      scope: authorizedWorkspace.scope,
      enterpriseId: authorizedWorkspace.enterpriseId,
      enterpriseName: authorizedWorkspace.enterpriseName,
    };

    return { session, workspace: safeWorkspace, membership };
  }

  let membership = await getUserWorkspaceRelation(
    session.user.id,
    workspace.workspaceId,
  );
  const membershipNeedsVerification =
    !membership ||
    !membership.verifiedAt ||
    Date.now() - new Date(membership.verifiedAt).getTime() >
      24 * 60 * 60 * 1000;

  if (membershipNeedsVerification) {
    if (!session.user.email) {
      throw new AuthorizationError(
        "Your Slack account does not expose an email address",
        403,
      );
    }

    const slackMember = await findWorkspaceMemberByEmail(
      workspace.botToken,
      session.user.email,
    );

    if (!slackMember || slackMember.teamId !== workspace.workspaceId) {
      throw new AuthorizationError(
        "You are not a member of the connected Slack workspace",
        403,
      );
    }

    membership = await createOrUpdateUserWorkspaceRelation({
      userId: session.user.id,
      workspaceId: workspace.workspaceId,
      slackUserId: slackMember.id,
    });
  }

  if (!membership) {
    throw new AuthorizationError("Workspace access could not be verified", 403);
  }

  const authorizedWorkspace = workspace as SensitiveWorkspace;

  if (includeSensitive) {
    return { session, workspace: authorizedWorkspace, membership };
  }

  const safeWorkspace: SafeWorkspace = {
    _id: authorizedWorkspace._id,
    workspaceId: authorizedWorkspace.workspaceId,
    workspaceName: authorizedWorkspace.workspaceName,
    botUserId: authorizedWorkspace.botUserId,
    scope: authorizedWorkspace.scope,
    enterpriseId: authorizedWorkspace.enterpriseId,
    enterpriseName: authorizedWorkspace.enterpriseName,
  };

  return { session, workspace: safeWorkspace, membership };
}
