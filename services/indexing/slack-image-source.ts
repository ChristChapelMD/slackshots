import mongoose from "mongoose";

import { type FileRecordDTO } from "@/services/api/db/models/file.model";
import { updateProviderFileMetadata } from "@/services/api/db/operations/file.operation";
import {
  fetchFile,
  getFileMetadata,
} from "@/services/api/integrations/slack/files";
import {
  getSlackApiErrorCode,
  isSlackFileUnavailableError,
} from "@/services/api/integrations/slack/errors";

type FileWithId = FileRecordDTO & { _id: mongoose.Types.ObjectId };

export class IndexingSourceError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "IndexingSourceError";
  }
}

export interface ImageSource {
  fetchImage(file: FileWithId, botToken: string): Promise<Blob>;
}

export class SlackImageSource implements ImageSource {
  async fetchImage(file: FileWithId, botToken: string): Promise<Blob> {
    const upload = file.uploads.find(
      (candidate) => candidate.provider === "slack" && candidate.providerFileId,
    );

    if (!upload) {
      throw new IndexingSourceError(
        "SLACK_FILE_NOT_LINKED",
        "The file record has no linked Slack image.",
      );
    }

    const preferredUrl = upload.providerThumbnailUrl || upload.providerFileUrl;

    if (preferredUrl) {
      try {
        return await this.readImageResponse(
          await fetchFile(preferredUrl, botToken),
        );
      } catch {
        // Slack URLs can expire; refresh them once before failing the job.
      }
    }

    try {
      const refreshed = await getFileMetadata(upload.providerFileId, botToken);
      const refreshedUrl =
        refreshed.providerThumbnailUrl || refreshed.providerFileUrl;

      if (!refreshedUrl) {
        throw new Error("Slack returned no downloadable URL.");
      }

      await updateProviderFileMetadata(
        file._id,
        upload.providerFileId,
        refreshed,
      );

      return await this.readImageResponse(
        await fetchFile(refreshedUrl, botToken),
      );
    } catch (error) {
      if (isSlackFileUnavailableError(error)) {
        throw new IndexingSourceError(
          "SLACK_FILE_UNAVAILABLE",
          `Slack cannot provide this file (${getSlackApiErrorCode(error)}).`,
        );
      }
      if (error instanceof IndexingSourceError) {
        throw error;
      }

      throw new IndexingSourceError(
        "SLACK_DOWNLOAD_FAILED",
        "Slack could not provide the image for indexing.",
      );
    }
  }

  private async readImageResponse(response: Response): Promise<Blob> {
    const contentType = response.headers.get("content-type")?.toLowerCase();

    if (!contentType?.startsWith("image/")) {
      throw new IndexingSourceError(
        "SLACK_RESPONSE_NOT_IMAGE",
        "Slack returned a non-image response for an image file.",
      );
    }

    const image = await response.blob();

    if (image.size === 0) {
      throw new IndexingSourceError(
        "SLACK_IMAGE_EMPTY",
        "Slack returned an empty image.",
      );
    }

    return image;
  }
}
