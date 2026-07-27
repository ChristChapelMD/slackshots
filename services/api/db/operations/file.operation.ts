import mongoose from "mongoose";

import { File, FileRecordStatus, FileRecordDTO } from "../models/file.model";

import dbConnect from "@/services/api/db/connection";

export type FileUpdateDetails = {
  errorMessage?: string;
  metadata?: Record<string, unknown>;
};

export interface UploadedBy {
  userId: string;
  name: string;
  email?: string;
  image?: string;
}

export async function findOrCreateFileRecordsForBatch(
  files: {
    fileName: string;
    fileSize: number;
    fileType: string;
  }[],
  uploadSessionId: string,
  workspaceId: mongoose.Types.ObjectId,
  uploadedBy: UploadedBy,
) {
  await dbConnect();

  const docs = files.map((file) => ({
    ...file,
    uploadSessionId,
    workspaceId,
    uploadedBy,
    status: FileRecordStatus.PENDING,
    uploads: [],
  }));

  // Always create one record per selected file so duplicate filenames do not collapse.
  return await File.insertMany(docs, { ordered: true });
}

export async function addUploadsToRecords(
  uploads: {
    fileRecordId: mongoose.Types.ObjectId;
    providerUpload: {
      provider: string;
      providerFileId: string;
      providerFileUrl: string;
      providerThumbnailUrl?: string;
    };
    metadata?: Record<string, unknown>;
  }[],
) {
  await dbConnect();

  if (!uploads.length) return 0;

  const result = await File.bulkWrite(
    uploads.map(({ fileRecordId, providerUpload, metadata }) => ({
      updateOne: {
        filter: { _id: fileRecordId },
        update: {
          $push: { uploads: providerUpload },
          $set: {
            status: FileRecordStatus.UPLOADED,
            ...(metadata ? { metadata } : {}),
          },
        },
      },
    })),
    { ordered: true },
  );

  return result.modifiedCount;
}

export async function findFileByProviderId(
  workspaceId: mongoose.Types.ObjectId,
  providerFileId: string,
) {
  await dbConnect();

  return File.findOne({
    workspaceId,
    "uploads.providerFileId": providerFileId,
  }).lean<FileRecordDTO & { _id: mongoose.Types.ObjectId }>();
}

export async function updateProviderFileMetadata(
  fileId: mongoose.Types.ObjectId,
  providerFileId: string,
  {
    providerFileUrl,
    providerThumbnailUrl,
    metadata,
  }: {
    providerFileUrl?: string;
    providerThumbnailUrl?: string;
    metadata?: Record<string, unknown>;
  },
) {
  await dbConnect();

  const updates: Record<string, unknown> = {};

  if (providerFileUrl) {
    updates["uploads.$.providerFileUrl"] = providerFileUrl;
  }
  if (providerThumbnailUrl) {
    updates["uploads.$.providerThumbnailUrl"] = providerThumbnailUrl;
  }
  if (metadata) {
    for (const [key, value] of Object.entries(metadata)) {
      if (value !== undefined) {
        updates[`metadata.${key}`] = value;
      }
    }
  }

  if (!Object.keys(updates).length) return null;

  return File.findOneAndUpdate(
    { _id: fileId, "uploads.providerFileId": providerFileId },
    { $set: updates },
    { new: true },
  ).lean<FileRecordDTO & { _id: mongoose.Types.ObjectId }>();
}

export async function updateFileRecord(
  fileId: mongoose.Types.ObjectId,
  status: FileRecordStatus,
  details: FileUpdateDetails = {},
) {
  await dbConnect();

  return await File.findByIdAndUpdate(
    fileId,
    { status, ...details },
    { new: true },
  );
}

export async function getPendingFilesBySession(uploadSessionId: string) {
  await dbConnect();

  return await File.find({
    uploadSessionId,
    status: FileRecordStatus.PENDING,
  }).sort({
    createdAt: 1,
  });
}

export async function getFailedFilesBySession(uploadSessionId: string) {
  await dbConnect();

  return await File.find({
    uploadSessionId,
    status: FileRecordStatus.FAILED,
  }).sort({
    createdAt: 1,
  });
}

export async function getFilesForWorkspace(
  workspaceId: mongoose.Types.ObjectId,
  limit: number = 16,
  fileTypes?: string[],
  cursor?: string | null,
): Promise<{
  files: Array<FileRecordDTO & { _id: mongoose.Types.ObjectId }>;
  nextCursor: string | null;
}> {
  await dbConnect();

  const filter: Record<string, unknown> = {
    workspaceId,
    status: FileRecordStatus.UPLOADED,
  };

  if (fileTypes?.length) {
    filter.fileType = { $in: fileTypes };
  }

  if (cursor) {
    try {
      const decoded = JSON.parse(
        Buffer.from(cursor, "base64url").toString("utf8"),
      ) as { createdAt: string; id: string };
      const cursorDate = new Date(decoded.createdAt);
      const cursorId = new mongoose.Types.ObjectId(decoded.id);

      filter.$or = [
        { createdAt: { $lt: cursorDate } },
        { createdAt: cursorDate, _id: { $lt: cursorId } },
      ];
    } catch {
      throw new Error("Invalid pagination cursor");
    }
  }

  const records = await File.find(filter)
    .select({
      fileName: 1,
      fileSize: 1,
      fileType: 1,
      uploadedBy: 1,
      uploads: 1,
      metadata: 1,
      createdAt: 1,
    })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean<Array<FileRecordDTO & { _id: mongoose.Types.ObjectId }>>();

  const hasMore = records.length > limit;
  const files = hasMore ? records.slice(0, limit) : records;
  const lastFile = files.at(-1);
  const nextCursor =
    hasMore && lastFile
      ? Buffer.from(
          JSON.stringify({
            createdAt: lastFile.createdAt.toISOString(),
            id: lastFile._id.toString(),
          }),
        ).toString("base64url")
      : null;

  return { files, nextCursor };
}

export async function markFileAsFailed(
  fileId: mongoose.Types.ObjectId,
  errorMessage?: string,
) {
  await dbConnect();

  return await updateFileRecord(fileId, FileRecordStatus.FAILED, {
    errorMessage,
  });
}

export async function bulkUpdateFilesStatus(
  fileIds: mongoose.Types.ObjectId[],
  status: FileRecordStatus,
  details: FileUpdateDetails = {},
) {
  await dbConnect();

  return await File.updateMany(
    { _id: { $in: fileIds } },
    { status, ...details },
  );
}

export async function deleteFilesForWorkspace(
  fileIds: mongoose.Types.ObjectId[],
  workspaceId: mongoose.Types.ObjectId,
): Promise<number> {
  await dbConnect();

  if (!fileIds.length) return 0;

  const result = await File.deleteMany({
    _id: { $in: fileIds },
    workspaceId,
  });

  return result.deletedCount ?? 0;
}

export async function getFilesByIdsForWorkspace(
  fileIds: mongoose.Types.ObjectId[],
  workspaceId: mongoose.Types.ObjectId,
) {
  await dbConnect();

  return File.find({
    _id: { $in: fileIds },
    workspaceId,
  })
    .select({ uploads: 1 })
    .lean<
      Array<Pick<FileRecordDTO, "uploads"> & { _id: mongoose.Types.ObjectId }>
    >();
}

export const anonymizeFileRecord = async (
  userId: mongoose.Types.ObjectId,
  fileIds: string[],
) => {
  await dbConnect();

  if (!fileIds.length) {
    return 0;
  }

  try {
    const result = await File.updateMany(
      { userId, "uploads.providerFileId": { $in: fileIds } },
      {
        $unset: {
          uploadedBy: "",
        },
      },
    );

    return result.modifiedCount;
  } catch (error) {
    throw error;
  }
};
