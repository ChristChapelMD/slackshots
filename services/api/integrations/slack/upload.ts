import { createSlackClient } from "./client";

interface UploadResponse {
  id: string;
  url_private: string;
  url: string;
  name?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  mimetype?: string;
  size?: number;
}

interface UploadResult {
  uploadResponseArray: UploadResponse[];
  fileMetadata: any[];
}

export async function uploadFiles(
  accessToken: string,
  file_uploads: { filename: string; file: Buffer }[],
  channel: string,
  comment?: string,
): Promise<UploadResult> {
  const client = createSlackClient(accessToken);
  const MAX_FILES_PER_UPLOAD = 10;

  try {
    const currentDate = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    if (!channel) {
      throw new Error("No channel specified");
    }

    const chunks: { filename: string; file: Buffer }[][] = [];

    for (let i = 0; i < file_uploads.length; i += MAX_FILES_PER_UPLOAD) {
      chunks.push(file_uploads.slice(i, i + MAX_FILES_PER_UPLOAD));
    }

    const uploadResponseArray: UploadResponse[] = [];
    const fileMetadata: any[] = [];

    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i];
      const messageSuffix =
        chunks.length > 1 ? ` (batch ${i + 1}/${chunks.length})` : "";

      const result: any = await client.files.uploadV2({
        channel_id: channel,
        initial_comment: `${comment || currentDate}${messageSuffix}`,
        file_uploads: chunk,
      });

      const normalizedResultFiles = Array.isArray(result?.files)
        ? result.files
        : result?.files
          ? [result.files]
          : [];

      const completedFiles = normalizedResultFiles
        .flatMap((entry: any) => {
          if (Array.isArray(entry?.files)) return entry.files;
          if (Array.isArray(entry?.file)) return entry.file;
          if (entry?.file) return [entry.file];

          return [entry];
        })
        .filter((file: any) => Boolean(file?.id || file?.file_id));

      fileMetadata.push(...completedFiles);
      uploadResponseArray.push(
        ...completedFiles.map((file: any) => ({
          id: file.id || file.file_id,
          url_private:
            file.url_private ||
            file.permalink_private ||
            file.file?.url_private ||
            file.file?.permalink_private ||
            "",
          url:
            file.url_private ||
            file.permalink_private ||
            file.file?.url_private ||
            file.file?.permalink_private ||
            "",
          name: file.title || file.name || file.file?.title || file.file?.name,
          thumbnailUrl:
            file.thumb_480 ||
            file.thumb_360 ||
            file.thumb_720 ||
            file.thumb_160 ||
            file.file?.thumb_480 ||
            file.file?.thumb_360 ||
            "",
          width: file.original_w || file.file?.original_w,
          height: file.original_h || file.file?.original_h,
          mimetype: file.mimetype || file.file?.mimetype,
          size: file.size || file.file?.size,
        })),
      );
    }

    return {
      uploadResponseArray,
      fileMetadata,
    };
  } catch (error: any) {
    console.error(`Failed to upload files to Slack: ${error.message}`);
    throw error;
  }
}
