import type { UploadedBy } from "../db/operations/file.operation";

import { ObjectId } from "mongodb";

import { FileRecordStatus } from "../db/models/file.model";
import {
  addUploadsToRecords,
  bulkUpdateFilesStatus,
  findOrCreateFileRecordsForBatch,
} from "../db/operations/file.operation";
import { uploadFiles } from "../integrations/slack/upload";

import { enqueueImageFile } from "@/services/indexing/indexing-queue";

type Provider = "slack";

interface Credentials {
  botToken: string;
  workspaceId: ObjectId;
  uploadedBy: UploadedBy;
}

export async function processAndUpload(
  provider: Provider,
  credentials: Credentials,
  formData: FormData,
) {
  const channel = formData.get("channel") as string;
  const comment = formData.get("comment") as string;
  const files = formData.getAll("files") as File[];
  const uploadSessionId = formData.get("uploadSessionId") as string;
  let fileRecords: Awaited<ReturnType<typeof findOrCreateFileRecordsForBatch>> =
    [];

  if (!channel) {
    throw new Error("Select a Slack channel before uploading.");
  }
  if (!uploadSessionId) {
    throw new Error("Upload session ID is required.");
  }
  if (!files.length) {
    throw new Error("Select at least one file to upload.");
  }
  if (files.length > 10) {
    throw new Error("A server upload batch cannot contain more than 10 files.");
  }
  if (files.some((file) => file.size <= 0)) {
    throw new Error("Empty files cannot be uploaded.");
  }

  try {
    const fileInfoForDB = files.map((file) => ({
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    }));

    fileRecords = await findOrCreateFileRecordsForBatch(
      fileInfoForDB,
      uploadSessionId,
      credentials.workspaceId,
      credentials.uploadedBy,
    );

    const bufferedFiles = await Promise.all(
      files.map(async (file) => ({
        filename: file.name,
        file: Buffer.from(await file.arrayBuffer()),
      })),
    );

    let uploadResult;

    switch (provider) {
      case "slack":
        uploadResult = await uploadFiles(
          credentials.botToken,
          bufferedFiles,
          channel,
          comment,
        );

        break;

      default:
        throw new Error(`Upload provider '${provider}' is not supported.`);
    }

    const slackFileResponses = (uploadResult.uploadResponseArray || []).filter(
      (file: any) => Boolean(file?.id),
    );

    if (!slackFileResponses.length) {
      throw new Error(
        "Slack upload completed but returned no files to link in the app.",
      );
    }

    const linkCount = Math.min(fileRecords.length, slackFileResponses.length);
    const linkedUploads = Array.from({ length: linkCount }).map((_, index) => {
      const record = fileRecords[index];
      const slackFile = slackFileResponses[index];

      const providerFileUrl =
        slackFile.url_private || slackFile.url || "missing-url";

      return {
        fileRecordId: record._id,
        providerUpload: {
          provider: "slack",
          providerFileId: slackFile.id,
          providerFileUrl,
          providerThumbnailUrl: slackFile.thumbnailUrl || undefined,
        },
        metadata: {
          width: slackFile.width,
          height: slackFile.height,
          mimetype: slackFile.mimetype,
          providerSize: slackFile.size,
          channelIds: [channel],
        },
      };
    });
    const linkedTotal = await addUploadsToRecords(linkedUploads);

    if (linkedTotal === 0) {
      throw new Error("No uploaded Slack files were linked to app records.");
    }

    if (slackFileResponses.length !== fileRecords.length) {
      const unlinkedRecordIds = fileRecords
        .slice(linkCount)
        .map((record) => record._id);

      if (unlinkedRecordIds.length) {
        await bulkUpdateFilesStatus(
          unlinkedRecordIds,
          FileRecordStatus.FAILED,
          { errorMessage: "Slack did not return a matching uploaded file." },
        );
      }

      console.warn(
        `[Upload] Linked ${linkedTotal}/${fileRecords.length} files. Slack returned ${slackFileResponses.length}.`,
      );
    }

    const enqueueResults = await Promise.allSettled(
      linkedUploads.map(({ fileRecordId }) => enqueueImageFile(fileRecordId)),
    );
    const enqueueFailures = enqueueResults.filter(
      (result) => result.status === "rejected",
    ).length;

    if (enqueueFailures) {
      console.warn(
        `[Indexing] ${enqueueFailures}/${linkedUploads.length} newly uploaded files were not queued. The backfill command can repair them.`,
      );
    }

    return uploadResult;
  } catch (error) {
    const pendingRecordIds = fileRecords.map((record) => record._id);

    if (pendingRecordIds.length) {
      await bulkUpdateFilesStatus(pendingRecordIds, FileRecordStatus.FAILED, {
        errorMessage: error instanceof Error ? error.message : "Upload failed",
      }).catch(() => undefined);
    }

    console.error("Error during upload process:", error);
    throw error;
  }
}
