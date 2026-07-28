interface SlackApiErrorLike {
  data?: {
    error?: unknown;
  };
}

const FILE_UNAVAILABLE_ERROR_CODES = new Set([
  "file_deleted",
  "file_not_found",
  "hidden_by_limit",
]);

export function getSlackApiErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;

  const code = (error as SlackApiErrorLike).data?.error;

  return typeof code === "string" ? code : null;
}

export function isSlackFileUnavailableError(error: unknown): boolean {
  const code = getSlackApiErrorCode(error);

  return code !== null && FILE_UNAVAILABLE_ERROR_CODES.has(code);
}
