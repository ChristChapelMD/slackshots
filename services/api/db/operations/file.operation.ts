import mongoose from "mongoose";

import { File, FileRecordStatus } from "../models/file.model";

import dbConnect from "@/services/api/db/connection";

export type FileUpdateDetails = {
  slackFileId?: string;
  slackFileUrl?: string;
  errorMessage?: string;
  aiTags?: string[];
  moderationFlag?: boolean;
};

export async function findOrCreateFileRecordsForBatch(
  files: {
    fileName: string;
    fileSize: number;
    fileType: string;
  }[],
  uploadSessionId: string,
  userId: mongoose.Types.ObjectId,
  workspaceId: mongoose.Types.ObjectId,
) {
  await dbConnect();

  const operations = files.map((file) => ({
    updateOne: {
      filter: {
        uploadSessionId,
        fileName: file.fileName,
        userId,
      },
      update: {
        $setOnInsert: {
          ...file,
          uploadSessionId,
          userId,
          workspaceId,
          status: FileRecordStatus.PENDING,
          uploads: [],
        },
      },
      upsert: true,
    },
  }));

  await File.bulkWrite(operations);

  return await File.find({
    uploadSessionId,
    userId,
    fileName: { $in: files.map((file) => file.fileName) },
  });
}

export async function addUploadToRecord(
  fileRecordId: mongoose.Types.ObjectId,
  providerUpload: {
    provider: string;
    providerFileId: string;
    providerFileUrl: string;
  },
) {
  await dbConnect();

  return await File.findByIdAndUpdate(
    fileRecordId,
    {
      $push: { uploads: providerUpload },
      $set: { status: FileRecordStatus.UPLOADED },
    },
    { new: true },
  );
}

export async function findFileByProviderId(providerFileId: string) {
  await dbConnect();

  return await File.findOne({ "uploads.providerFileId": providerFileId });
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

export async function getPendingFilesBySession(uploadSessionID: string) {
  await dbConnect();

  return await File.find({
    uploadSessionID,
    status: FileRecordStatus.PENDING,
  }).sort({
    createdAt: 1,
  });
}

export async function getFailedFilesBySession(uploadSessionID: string) {
  await dbConnect();

  return await File.find({
    uploadSessionID,
    status: FileRecordStatus.FAILED,
  }).sort({
    createdAt: 1,
  });
}

export async function getFilesForUser(
  userId: mongoose.Types.ObjectId,
  workspaceId?: mongoose.Types.ObjectId,
  page: number = 1,
  limit: number = 16,
  fileTypes?: string[],
): Promise<{ files: File[]; total: number }> {
  await dbConnect();

  const filter: Record<string, unknown> = {
    userId,
    status: FileRecordStatus.UPLOADED,
  };

  if (workspaceId) {
    filter.workspaceId = workspaceId;
  }

  if (fileTypes?.length) {
    filter.fileType = { $in: fileTypes };
  }

  const skip = (page - 1) * limit;

  const [files, total] = await Promise.all([
    File.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    File.countDocuments(filter),
  ]);

  return { files, total };
}

export async function getFilesForWorkspace(
  workspaceId: string,
  page: number = 1,
  limit: number = 16,
) {
  await dbConnect();

  return await File.find({
    workspaceId,
    status: FileRecordStatus.UPLOADED,
  })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
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

export async function deleteFilesForUserWorkspace(
  fileIds: mongoose.Types.ObjectId[],
  userId: mongoose.Types.ObjectId,
  workspaceId: mongoose.Types.ObjectId,
): Promise<number> {
  await dbConnect();

  if (!fileIds.length) return 0;

  const result = await File.deleteMany({
    _id: { $in: fileIds },
    userId,
    workspaceId,
  });

  return result.deletedCount ?? 0;
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
      { userId, slackFileID: { $in: fileIds } },
      {
        $unset: {
          name: "",
          slackFileID: "",
          slackFileURL: "",
        },
      },
    );

    return result.modifiedCount;
  } catch (error) {
    throw error;
  }
};
