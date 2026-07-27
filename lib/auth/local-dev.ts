import "server-only";

import type { Session, User } from "better-auth";

export type ServerAuthSession = {
  session: Session;
  user: User;
};

export function isLocalDevAuthBypassEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.LOCAL_DEV_AUTH_BYPASS === "true"
  );
}

export function getLocalDevAuthSession(): ServerAuthSession | null {
  if (!isLocalDevAuthBypassEnabled()) {
    return null;
  }

  const now = new Date();
  const userId = process.env.LOCAL_DEV_USER_ID || "local-dev-user";

  return {
    user: {
      id: userId,
      name: process.env.LOCAL_DEV_USER_NAME || "Local developer",
      email:
        process.env.LOCAL_DEV_USER_EMAIL || "local-developer@slackshots.dev",
      emailVerified: true,
      image: null,
      createdAt: now,
      updatedAt: now,
    },
    session: {
      id: "local-dev-session",
      userId,
      token: "local-dev-only",
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      ipAddress: null,
      userAgent: "SlackShots local development",
    },
  };
}
