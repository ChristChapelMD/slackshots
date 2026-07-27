import { NextResponse } from "next/server";

import {
  AuthorizationError,
  requireWorkspaceAccess,
} from "@/services/api/auth/workspace-access";
import {
  findFileByProviderId,
  updateProviderFileMetadata,
} from "@/services/api/db/operations/file.operation";
import {
  fetchFile,
  getFileMetadata,
} from "@/services/api/integrations/slack/files";

const MAX_FETCH_ATTEMPTS = 2;

function isRetryableFetchError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const cause = (error as any)?.cause;
  const code = (cause as any)?.code;

  return (
    message.toLowerCase().includes("terminated") ||
    message.toLowerCase().includes("socket") ||
    code === "UND_ERR_SOCKET"
  );
}

export async function GET(
  request: Request,
  context: { params: Promise<{ providerFileId: string }> },
) {
  const params = await context.params;
  const { providerFileId } = params;

  try {
    const { workspace } = await requireWorkspaceAccess(request, true);

    let fileRecord = await findFileByProviderId(workspace._id, providerFileId);

    if (!fileRecord) {
      return new NextResponse("Not Found", { status: 404 });
    }

    let slackUpload = fileRecord.uploads.find(
      (upload: any) => upload.provider === "slack",
    );

    if (!slackUpload) {
      return new NextResponse("File not found on provider", { status: 404 });
    }

    const requestUrl = new URL(request.url);
    const useThumbnail = requestUrl.searchParams.get("variant") === "thumbnail";

    if (
      !slackUpload.providerFileUrl ||
      (useThumbnail && !slackUpload.providerThumbnailUrl)
    ) {
      const providerMetadata = await getFileMetadata(
        providerFileId,
        workspace.botToken as string,
      );

      const updatedRecord = await updateProviderFileMetadata(
        fileRecord._id,
        providerFileId,
        providerMetadata,
      );

      if (updatedRecord) {
        fileRecord = updatedRecord;
        slackUpload = fileRecord.uploads.find(
          (upload: any) => upload.provider === "slack",
        )!;
      }
    }

    const providerUrl =
      (useThumbnail && slackUpload.providerThumbnailUrl) ||
      slackUpload.providerFileUrl;

    if (!providerUrl) {
      return new NextResponse("File URL is unavailable", { status: 502 });
    }

    let slackResponse: Response | null = null;

    for (let attempt = 0; attempt < MAX_FETCH_ATTEMPTS; attempt += 1) {
      try {
        slackResponse = await fetchFile(
          providerUrl,
          workspace.botToken as string,
          request.headers.get("range"),
        );

        break;
      } catch (error) {
        const shouldRetry =
          attempt < MAX_FETCH_ATTEMPTS - 1 && isRetryableFetchError(error);

        if (shouldRetry) {
          continue;
        }

        throw error;
      }
    }

    if (!slackResponse?.body) {
      return new NextResponse("Response from provider contained no data.", {
        status: 502,
      });
    }

    const resolvedContentType =
      slackResponse.headers.get("content-type") ||
      fileRecord.fileType ||
      "application/octet-stream";
    const encodedFileName = encodeURIComponent(fileRecord.fileName || "file");

    const responseHeaders: Record<string, string> = {
      "Content-Type": resolvedContentType,
      "Cache-Control": useThumbnail
        ? "private, max-age=86400, stale-while-revalidate=604800"
        : "private, max-age=3600, stale-while-revalidate=86400",
      "Content-Disposition": `inline; filename*=UTF-8''${encodedFileName}`,
    };

    for (const header of [
      "content-length",
      "content-range",
      "accept-ranges",
      "etag",
      "last-modified",
    ]) {
      const value = slackResponse.headers.get(header);

      if (value) {
        responseHeaders[header] = value;
      }
    }

    return new NextResponse(slackResponse.body, {
      status: slackResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return new NextResponse(error.message, { status: error.status });
    }
    console.error("[File Proxy Error]:", error);

    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
