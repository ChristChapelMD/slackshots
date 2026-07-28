import mongoose from "mongoose";

import {
  File,
  FileRecordDTO,
  FileRecordStatus,
} from "../api/db/models/file.model";
import {
  ImageIndex,
  ImageIndexStatus,
} from "../api/db/models/image-index.model";
import {
  IndexingJob,
  IndexingJobKind,
  IndexingJobStatus,
  type IndexingJobDTO,
} from "../api/db/models/indexing-job.model";
import { IndexingControl } from "../api/db/models/indexing-control.model";
import {
  IndexingRequest,
  IndexingRequestStatus,
  IndexingRequestType,
  type IndexingRequestDTO,
} from "../api/db/models/indexing-request.model";
import dbConnect from "../api/db/connection";
import {
  DEFAULT_IMAGE_EMBEDDING_DIMENSIONS,
  DEFAULT_IMAGE_EMBEDDING_DTYPE,
  DEFAULT_IMAGE_EMBEDDING_MODEL,
  DEFAULT_IMAGE_EMBEDDING_REVISION,
  DEFAULT_IMAGE_EMBEDDING_VERSION,
} from "../embeddings/image-embedder";

type FileWithId = FileRecordDTO & { _id: mongoose.Types.ObjectId };
type JobWithId = IndexingJobDTO & { _id: mongoose.Types.ObjectId };
type RequestWithId = IndexingRequestDTO & { _id: mongoose.Types.ObjectId };

interface EnqueueOptions {
  force?: boolean;
  priority?: number;
}

interface EnqueueAllOptions extends EnqueueOptions {
  limit?: number;
  newestFirst?: boolean;
}

interface ClaimOptions {
  workerId: string;
  leaseDurationMs: number;
  workspaceId?: mongoose.Types.ObjectId;
}

export interface EnqueueAllResult {
  scanned: number;
  enqueued: number;
  alreadyComplete: number;
  skipped: number;
}

export interface IndexingStatusSnapshot {
  totalImages: number;
  indexed: number;
  pending: number;
  processing: number;
  failed: number;
  stale: number;
  unindexed: number;
  queuedJobs: number;
  activeJobs: number;
  activeBackfills: number;
  isPaused: boolean;
  workerOnline: boolean;
  lastIndexedAt: Date | null;
}

interface BackfillRequestOptions {
  limit?: number;
  newestFirst?: boolean;
  force?: boolean;
  requestedBy?: string;
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function readChannelIds(
  metadata: Record<string, unknown> | undefined,
): string[] {
  if (!metadata) return [];

  const channelIds = metadata.channelIds;

  if (Array.isArray(channelIds)) {
    return channelIds.filter(
      (channelId): channelId is string => typeof channelId === "string",
    );
  }

  return typeof metadata.channelId === "string" ? [metadata.channelId] : [];
}

function sourceMetadataFor(file: FileWithId) {
  return {
    fileName: file.fileName,
    fileType: file.fileType,
    createdAt: file.createdAt,
    uploaderId: file.uploadedBy?.userId,
    uploaderName: file.uploadedBy?.name,
    channelIds: readChannelIds(file.metadata),
    width: asFiniteNumber(file.metadata?.width),
    height: asFiniteNumber(file.metadata?.height),
  };
}

export async function enqueueImageFile(
  fileRecordId: mongoose.Types.ObjectId,
  options: EnqueueOptions = {},
): Promise<"enqueued" | "already-complete" | "skipped"> {
  await dbConnect();

  const file = await File.findOne({
    _id: fileRecordId,
    status: FileRecordStatus.UPLOADED,
    fileType: /^image\//,
  }).lean<FileWithId>();

  if (!file) return "skipped";

  return enqueueImageFileRecord(file, options);
}

async function enqueueImageFileRecord(
  file: FileWithId,
  options: EnqueueOptions,
): Promise<"enqueued" | "already-complete" | "skipped"> {
  const slackUpload = file.uploads.find(
    (upload) => upload.provider === "slack" && upload.providerFileId,
  );

  if (!slackUpload) return "skipped";

  const existingIndex = await ImageIndex.findOne({
    workspaceId: file.workspaceId,
    fileRecordId: file._id,
    indexVersion: DEFAULT_IMAGE_EMBEDDING_VERSION,
  }).lean<{ _id: mongoose.Types.ObjectId; status: ImageIndexStatus }>();

  if (existingIndex?.status === ImageIndexStatus.COMPLETE && !options.force) {
    return "already-complete";
  }

  const imageIndex = await ImageIndex.findOneAndUpdate(
    {
      workspaceId: file.workspaceId,
      fileRecordId: file._id,
      indexVersion: DEFAULT_IMAGE_EMBEDDING_VERSION,
    },
    {
      $set: {
        providerFileId: slackUpload.providerFileId,
        sourceMetadata: sourceMetadataFor(file),
        status: options.force
          ? ImageIndexStatus.PENDING
          : (existingIndex?.status ?? ImageIndexStatus.PENDING),
      },
      $setOnInsert: {
        workspaceId: file.workspaceId,
        fileRecordId: file._id,
        indexVersion: DEFAULT_IMAGE_EMBEDDING_VERSION,
        embeddingModel: DEFAULT_IMAGE_EMBEDDING_MODEL,
        embeddingRevision: DEFAULT_IMAGE_EMBEDDING_REVISION,
        embeddingDtype: DEFAULT_IMAGE_EMBEDDING_DTYPE,
        embeddingDimensions: DEFAULT_IMAGE_EMBEDDING_DIMENSIONS,
        tags: [],
      },
      ...(options.force
        ? {
            $unset: {
              embedding: "",
              errorCode: "",
              indexedAt: "",
              processingOwner: "",
            },
          }
        : {}),
    },
    { new: true, upsert: true },
  ).lean<{ _id: mongoose.Types.ObjectId; status: ImageIndexStatus }>();

  if (!imageIndex) {
    throw new Error("Failed to create the image index record.");
  }

  const existingJob = await IndexingJob.findOne({
    workspaceId: file.workspaceId,
    fileRecordId: file._id,
    kind: IndexingJobKind.IMAGE_EMBEDDING,
    indexVersion: DEFAULT_IMAGE_EMBEDDING_VERSION,
  }).lean<JobWithId>();

  if (existingJob?.status === IndexingJobStatus.PROCESSING && !options.force) {
    return "enqueued";
  }

  const shouldResetJob =
    options.force ||
    !existingJob ||
    imageIndex.status !== ImageIndexStatus.COMPLETE;

  await IndexingJob.findOneAndUpdate(
    {
      workspaceId: file.workspaceId,
      fileRecordId: file._id,
      kind: IndexingJobKind.IMAGE_EMBEDDING,
      indexVersion: DEFAULT_IMAGE_EMBEDDING_VERSION,
    },
    {
      $set: {
        imageIndexId: imageIndex._id,
        priority: options.priority ?? existingJob?.priority ?? 0,
        ...(shouldResetJob
          ? {
              status: IndexingJobStatus.PENDING,
              availableAt: new Date(),
              attempts: 0,
              errorCode: null,
              completedAt: null,
              leaseOwner: null,
              leaseExpiresAt: null,
            }
          : {}),
      },
      $setOnInsert: {
        workspaceId: file.workspaceId,
        fileRecordId: file._id,
        kind: IndexingJobKind.IMAGE_EMBEDDING,
        indexVersion: DEFAULT_IMAGE_EMBEDDING_VERSION,
        maxAttempts: 5,
      },
    },
    { upsert: true },
  );

  return "enqueued";
}

export async function enqueueAllExistingImages(
  workspaceId: mongoose.Types.ObjectId,
  options: EnqueueAllOptions = {},
): Promise<EnqueueAllResult> {
  await dbConnect();

  const result: EnqueueAllResult = {
    scanned: 0,
    enqueued: 0,
    alreadyComplete: 0,
    skipped: 0,
  };
  let lastId: mongoose.Types.ObjectId | undefined;

  while (true) {
    const records = await File.find({
      workspaceId,
      status: FileRecordStatus.UPLOADED,
      fileType: /^image\//,
      ...(lastId
        ? {
            _id: options.newestFirst ? { $lt: lastId } : { $gt: lastId },
          }
        : {}),
    })
      .sort({ _id: options.newestFirst ? -1 : 1 })
      .limit(100)
      .lean<FileWithId[]>();

    if (records.length === 0) break;

    for (const record of records) {
      if (options.limit && result.scanned >= options.limit) {
        return result;
      }

      const status = await enqueueImageFileRecord(record, options);

      result.scanned += 1;
      if (status === "enqueued") result.enqueued += 1;
      if (status === "already-complete") result.alreadyComplete += 1;
      if (status === "skipped") result.skipped += 1;
    }

    lastId = records.at(-1)?._id;
  }

  return result;
}

export async function createBackfillRequest(
  workspaceId: mongoose.Types.ObjectId,
  options: BackfillRequestOptions = {},
): Promise<mongoose.Types.ObjectId> {
  await dbConnect();

  const requestShape = {
    workspaceId,
    type: IndexingRequestType.BACKFILL,
    limit: options.limit,
    newestFirst: options.newestFirst ?? false,
    force: options.force ?? false,
  };
  const existing = await IndexingRequest.findOne({
    ...requestShape,
    status: {
      $in: [IndexingRequestStatus.PENDING, IndexingRequestStatus.PROCESSING],
    },
  }).lean<{ _id: mongoose.Types.ObjectId }>();

  if (existing) return existing._id;

  const request = await IndexingRequest.create({
    ...requestShape,
    status: IndexingRequestStatus.PENDING,
    requestedBy: options.requestedBy,
  });

  return request._id;
}

export async function processNextBackfillRequest({
  workerId,
  workspaceId,
}: {
  workerId: string;
  workspaceId?: mongoose.Types.ObjectId;
}): Promise<{
  processed: boolean;
  succeeded?: boolean;
  result?: EnqueueAllResult;
}> {
  await dbConnect();

  const pausedWorkspaceIds = await getPausedWorkspaceIds();

  if (workspaceId && pausedWorkspaceIds.some((id) => id.equals(workspaceId))) {
    return { processed: false };
  }

  const now = new Date();
  const request = await IndexingRequest.findOneAndUpdate(
    {
      type: IndexingRequestType.BACKFILL,
      ...(workspaceId
        ? { workspaceId }
        : pausedWorkspaceIds.length
          ? { workspaceId: { $nin: pausedWorkspaceIds } }
          : {}),
      $or: [
        { status: IndexingRequestStatus.PENDING },
        {
          status: IndexingRequestStatus.PROCESSING,
          leaseExpiresAt: { $lte: now },
        },
      ],
    },
    {
      $set: {
        status: IndexingRequestStatus.PROCESSING,
        leaseOwner: workerId,
        leaseExpiresAt: new Date(now.getTime() + 30 * 60_000),
        errorCode: null,
      },
    },
    { new: true, sort: { createdAt: 1 } },
  ).lean<RequestWithId>();

  if (!request) return { processed: false };

  try {
    const result = await enqueueAllExistingImages(request.workspaceId, {
      limit: request.limit,
      newestFirst: request.newestFirst,
      force: request.force,
    });

    await IndexingRequest.updateOne(
      { _id: request._id, leaseOwner: workerId },
      {
        $set: {
          status: IndexingRequestStatus.COMPLETE,
          result,
          completedAt: new Date(),
        },
        $unset: { leaseOwner: "", leaseExpiresAt: "" },
      },
    );

    return { processed: true, succeeded: true, result };
  } catch {
    await IndexingRequest.updateOne(
      { _id: request._id, leaseOwner: workerId },
      {
        $set: {
          status: IndexingRequestStatus.FAILED,
          errorCode: "BACKFILL_FAILED",
        },
        $unset: { leaseOwner: "", leaseExpiresAt: "" },
      },
    );

    return { processed: true, succeeded: false };
  }
}

export async function getIndexingStatus(
  workspaceId: mongoose.Types.ObjectId,
): Promise<IndexingStatusSnapshot> {
  await dbConnect();

  const [
    totalImages,
    indexCounts,
    jobCounts,
    activeBackfills,
    control,
    latest,
  ] = await Promise.all([
    File.countDocuments({
      workspaceId,
      status: FileRecordStatus.UPLOADED,
      fileType: /^image\//,
    }),
    ImageIndex.aggregate<{ _id: ImageIndexStatus; count: number }>([
      {
        $match: {
          workspaceId,
          indexVersion: DEFAULT_IMAGE_EMBEDDING_VERSION,
        },
      },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    IndexingJob.aggregate<{ _id: IndexingJobStatus; count: number }>([
      {
        $match: {
          workspaceId,
          indexVersion: DEFAULT_IMAGE_EMBEDDING_VERSION,
        },
      },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    IndexingRequest.countDocuments({
      workspaceId,
      status: {
        $in: [IndexingRequestStatus.PENDING, IndexingRequestStatus.PROCESSING],
      },
    }),
    IndexingControl.findOneAndUpdate(
      { workspaceId },
      { $setOnInsert: { workspaceId, isPaused: false } },
      { new: true, upsert: true },
    ).lean<{
      isPaused: boolean;
      workerHeartbeatAt?: Date;
    }>(),
    ImageIndex.findOne({
      workspaceId,
      indexVersion: DEFAULT_IMAGE_EMBEDDING_VERSION,
      status: ImageIndexStatus.COMPLETE,
    })
      .sort({ indexedAt: -1 })
      .select({ indexedAt: 1 })
      .lean<{ indexedAt?: Date }>(),
  ]);
  const indexesByStatus = new Map(
    indexCounts.map(({ _id, count }) => [_id, count]),
  );
  const jobsByStatus = new Map(jobCounts.map(({ _id, count }) => [_id, count]));
  const indexed = indexesByStatus.get(ImageIndexStatus.COMPLETE) ?? 0;
  const pending = indexesByStatus.get(ImageIndexStatus.PENDING) ?? 0;
  const processing = indexesByStatus.get(ImageIndexStatus.PROCESSING) ?? 0;
  const failed = indexesByStatus.get(ImageIndexStatus.FAILED) ?? 0;
  const stale = indexesByStatus.get(ImageIndexStatus.STALE) ?? 0;
  const indexedRecordCount = indexed + pending + processing + failed + stale;
  const heartbeatAt = control?.workerHeartbeatAt
    ? new Date(control.workerHeartbeatAt).getTime()
    : 0;

  return {
    totalImages,
    indexed,
    pending,
    processing,
    failed,
    stale,
    unindexed: Math.max(0, totalImages - indexedRecordCount),
    queuedJobs: jobsByStatus.get(IndexingJobStatus.PENDING) ?? 0,
    activeJobs: jobsByStatus.get(IndexingJobStatus.PROCESSING) ?? 0,
    activeBackfills,
    isPaused: control?.isPaused ?? false,
    workerOnline: Date.now() - heartbeatAt < 15_000,
    lastIndexedAt: latest?.indexedAt ?? null,
  };
}

export async function setIndexingPaused(
  workspaceId: mongoose.Types.ObjectId,
  isPaused: boolean,
): Promise<void> {
  await dbConnect();

  await IndexingControl.updateOne(
    { workspaceId },
    { $set: { isPaused }, $setOnInsert: { workspaceId } },
    { upsert: true },
  );
}

export async function recordWorkerHeartbeat(
  workerId: string,
  workspaceId?: mongoose.Types.ObjectId,
): Promise<void> {
  await dbConnect();

  const update = {
    $set: {
      workerId,
      workerHeartbeatAt: new Date(),
    },
  };

  if (workspaceId) {
    await IndexingControl.updateOne(
      { workspaceId },
      { ...update, $setOnInsert: { workspaceId, isPaused: false } },
      { upsert: true },
    );

    return;
  }

  await IndexingControl.updateMany({}, update);
}

export async function retryFailedIndexingJobs(
  workspaceId: mongoose.Types.ObjectId,
): Promise<number> {
  await dbConnect();

  const [jobs] = await Promise.all([
    IndexingJob.updateMany(
      {
        workspaceId,
        indexVersion: DEFAULT_IMAGE_EMBEDDING_VERSION,
        status: IndexingJobStatus.FAILED,
      },
      {
        $set: {
          status: IndexingJobStatus.PENDING,
          attempts: 0,
          availableAt: new Date(),
          errorCode: null,
        },
        $unset: {
          leaseOwner: "",
          leaseExpiresAt: "",
          completedAt: "",
        },
      },
    ),
    ImageIndex.updateMany(
      {
        workspaceId,
        indexVersion: DEFAULT_IMAGE_EMBEDDING_VERSION,
        status: ImageIndexStatus.FAILED,
      },
      {
        $set: { status: ImageIndexStatus.PENDING, errorCode: null },
        $unset: { processingOwner: "" },
      },
    ),
  ]);

  return jobs.modifiedCount;
}

export async function claimNextIndexingJob({
  workerId,
  leaseDurationMs,
  workspaceId,
}: ClaimOptions): Promise<JobWithId | null> {
  await dbConnect();

  const now = new Date();
  const leaseExpiresAt = new Date(now.getTime() + leaseDurationMs);
  const pausedWorkspaceIds = await getPausedWorkspaceIds();

  if (workspaceId && pausedWorkspaceIds.some((id) => id.equals(workspaceId))) {
    return null;
  }

  const job = await IndexingJob.findOneAndUpdate(
    {
      kind: IndexingJobKind.IMAGE_EMBEDDING,
      ...(workspaceId
        ? { workspaceId }
        : pausedWorkspaceIds.length
          ? { workspaceId: { $nin: pausedWorkspaceIds } }
          : {}),
      $expr: { $lt: ["$attempts", "$maxAttempts"] },
      $or: [
        {
          status: IndexingJobStatus.PENDING,
          availableAt: { $lte: now },
        },
        {
          status: IndexingJobStatus.PROCESSING,
          leaseExpiresAt: { $lte: now },
        },
      ],
    },
    {
      $set: {
        status: IndexingJobStatus.PROCESSING,
        leaseOwner: workerId,
        leaseExpiresAt,
        startedAt: now,
        errorCode: null,
      },
      $inc: { attempts: 1 },
    },
    {
      new: true,
      sort: { priority: -1, createdAt: 1 },
    },
  ).lean<JobWithId>();

  return job;
}

async function getPausedWorkspaceIds(): Promise<mongoose.Types.ObjectId[]> {
  return IndexingControl.find({ isPaused: true }).distinct("workspaceId");
}

export async function deleteIndexingDataForFiles(
  workspaceId: mongoose.Types.ObjectId,
  fileRecordIds: mongoose.Types.ObjectId[],
): Promise<void> {
  await dbConnect();

  if (fileRecordIds.length === 0) return;

  await Promise.all([
    IndexingJob.deleteMany({
      workspaceId,
      fileRecordId: { $in: fileRecordIds },
    }),
    ImageIndex.deleteMany({
      workspaceId,
      fileRecordId: { $in: fileRecordIds },
    }),
  ]);
}
