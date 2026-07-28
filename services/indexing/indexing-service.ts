import type { ImageEmbedder } from "@/services/embeddings/image-embedder";
import type { ImageVectorIndex } from "@/services/search/vector-index";

import mongoose from "mongoose";

import { claimNextIndexingJob } from "./indexing-queue";
import {
  IndexingSourceError,
  type ImageSource,
  SlackImageSource,
} from "./slack-image-source";

import { File, type FileRecordDTO } from "@/services/api/db/models/file.model";
import {
  ImageIndex,
  ImageIndexStatus,
} from "@/services/api/db/models/image-index.model";
import {
  IndexingJob,
  IndexingJobStatus,
  type IndexingJobDTO,
} from "@/services/api/db/models/indexing-job.model";
import { getWorkspaceById } from "@/services/api/db/operations/workspace.operation";
import { MongoImageVectorIndex } from "@/services/search/mongo-image-vector-index";

type FileWithId = FileRecordDTO & { _id: mongoose.Types.ObjectId };
type JobWithId = IndexingJobDTO & { _id: mongoose.Types.ObjectId };

export interface ProcessJobResult {
  processed: boolean;
  succeeded?: boolean;
  fileRecordId?: string;
  errorCode?: string;
}

interface IndexingServiceOptions {
  workerId: string;
  workspaceId?: mongoose.Types.ObjectId;
  leaseDurationMs?: number;
  imageSource?: ImageSource;
  vectorIndex?: ImageVectorIndex;
}

export class IndexingService {
  private readonly imageSource: ImageSource;
  private readonly leaseDurationMs: number;
  private readonly vectorIndex: ImageVectorIndex;

  constructor(
    private readonly embedder: ImageEmbedder,
    private readonly options: IndexingServiceOptions,
  ) {
    this.imageSource = options.imageSource ?? new SlackImageSource();
    this.leaseDurationMs = options.leaseDurationMs ?? 30 * 60 * 1000;
    this.vectorIndex = options.vectorIndex ?? new MongoImageVectorIndex();
  }

  async processNextJob(): Promise<ProcessJobResult> {
    const job = await claimNextIndexingJob({
      workerId: this.options.workerId,
      leaseDurationMs: this.leaseDurationMs,
      workspaceId: this.options.workspaceId,
    });

    if (!job) return { processed: false };

    await ImageIndex.updateOne(
      { _id: job.imageIndexId },
      {
        $set: {
          status: ImageIndexStatus.PROCESSING,
          processingOwner: this.options.workerId,
          errorCode: null,
        },
      },
    );

    try {
      const [file, workspace] = await Promise.all([
        File.findOne({
          _id: job.fileRecordId,
          workspaceId: job.workspaceId,
        }).lean<FileWithId>(),
        getWorkspaceById(job.workspaceId, true),
      ]);

      if (!file) {
        throw new IndexingSourceError(
          "FILE_RECORD_MISSING",
          "The source file record no longer exists.",
        );
      }
      if (!workspace?.botToken) {
        throw new IndexingSourceError(
          "WORKSPACE_TOKEN_MISSING",
          "The workspace has no Slack bot token.",
        );
      }

      const image = await this.imageSource.fetchImage(
        file,
        workspace.botToken as string,
      );
      const embedding = await this.embedder.embedImage(image);
      const didUpdate = await this.vectorIndex.upsertImageEmbedding({
        imageIndexId: job.imageIndexId,
        processingOwner: this.options.workerId,
        embedding,
      });

      if (!didUpdate) {
        throw new IndexingSourceError(
          "INDEX_LEASE_LOST",
          "The image index lease was claimed by another worker.",
        );
      }

      await IndexingJob.updateOne(
        {
          _id: job._id,
          leaseOwner: this.options.workerId,
        },
        {
          $set: {
            status: IndexingJobStatus.COMPLETE,
            completedAt: new Date(),
            errorCode: null,
          },
          $unset: {
            leaseOwner: "",
            leaseExpiresAt: "",
          },
        },
      );

      return {
        processed: true,
        succeeded: true,
        fileRecordId: job.fileRecordId.toString(),
      };
    } catch (error) {
      const errorCode = this.getSafeErrorCode(error);

      await this.failOrRetry(job, errorCode);

      return {
        processed: true,
        succeeded: false,
        fileRecordId: job.fileRecordId.toString(),
        errorCode,
      };
    }
  }

  private async failOrRetry(job: JobWithId, errorCode: string): Promise<void> {
    const isTerminalSourceError = [
      "FILE_RECORD_MISSING",
      "SLACK_FILE_NOT_LINKED",
      "SLACK_FILE_UNAVAILABLE",
      "SLACK_IMAGE_EMPTY",
      "SLACK_RESPONSE_NOT_IMAGE",
    ].includes(errorCode);
    const isFinalAttempt = job.attempts >= job.maxAttempts;
    const retryDelayMs = Math.min(5 * 60_000, 2 ** job.attempts * 5_000);
    const nextStatus = isTerminalSourceError
      ? IndexingJobStatus.CANCELLED
      : isFinalAttempt
        ? IndexingJobStatus.FAILED
        : IndexingJobStatus.PENDING;

    await Promise.all([
      IndexingJob.updateOne(
        {
          _id: job._id,
          leaseOwner: this.options.workerId,
        },
        {
          $set: {
            status: nextStatus,
            errorCode,
            availableAt: new Date(Date.now() + retryDelayMs),
          },
          $unset: {
            leaseOwner: "",
            leaseExpiresAt: "",
          },
        },
      ),
      ImageIndex.updateOne(
        {
          _id: job.imageIndexId,
          processingOwner: this.options.workerId,
        },
        {
          $set: {
            status: isTerminalSourceError
              ? ImageIndexStatus.STALE
              : isFinalAttempt
                ? ImageIndexStatus.FAILED
                : ImageIndexStatus.PENDING,
            errorCode,
          },
          $unset: { processingOwner: "" },
        },
      ),
    ]);
  }

  private getSafeErrorCode(error: unknown): string {
    if (error instanceof IndexingSourceError) {
      return error.code;
    }

    return "IMAGE_EMBEDDING_FAILED";
  }
}
