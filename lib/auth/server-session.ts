import "server-only";

import { auth } from "@/lib/auth";
import {
  getLocalDevAuthSession,
  ServerAuthSession,
} from "@/lib/auth/local-dev";

export async function getServerAuthSession(
  requestHeaders: Headers,
): Promise<ServerAuthSession | null> {
  const localSession = getLocalDevAuthSession();

  if (localSession) {
    return localSession;
  }

  return auth.api.getSession({ headers: requestHeaders });
}
