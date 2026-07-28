export async function fetchFile(
  slackFileUrl: string,
  botToken: string,
  range?: string | null,
): Promise<Response> {
  try {
    const slackResponse = await fetch(slackFileUrl, {
      headers: {
        Authorization: `Bearer ${botToken}`,
        ...(range ? { Range: range } : {}),
      },
      cache: "no-store",
    });

    if (!slackResponse.ok || !slackResponse.body) {
      throw new Error("Failed to fetch file from provider.");
    }

    return slackResponse;
  } catch (error) {
    console.error("Error fetching file from Slack:", error);
    throw error;
  }
}

export async function getFileMetadata(
  providerFileId: string,
  botToken: string,
) {
  const { createSlackClient } = await import("./client");
  const client = createSlackClient(botToken);
  const result = await client.files.info({ file: providerFileId });
  const file = result.file;

  if (!file) {
    throw new Error("Slack did not return file metadata.");
  }

  return {
    providerFileUrl: file.url_private || file.permalink || "",
    providerThumbnailUrl:
      file.thumb_720 ||
      file.thumb_480 ||
      file.thumb_360 ||
      file.thumb_160 ||
      file.thumb_80 ||
      "",
    metadata: {
      width: file.original_w,
      height: file.original_h,
      mimetype: file.mimetype,
      providerSize: file.size,
      providerCreatedAt: file.created
        ? new Date(file.created * 1000).toISOString()
        : undefined,
    },
  };
}

export async function deleteFile(
  providerFileId: string,
  botToken: string,
): Promise<void> {
  const { createSlackClient } = await import("./client");
  const client = createSlackClient(botToken);

  await client.files.delete({ file: providerFileId });
}
