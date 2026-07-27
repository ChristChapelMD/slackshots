"use client";

import type { QueryClient } from "@tanstack/react-query";

import { useCallback } from "react";
import { addToast } from "@heroui/toast";
import { useQueryClient } from "@tanstack/react-query";

import { client } from "@/services/client";
import {
  UploadJob,
  useUploadProcessStore,
} from "@/stores/upload-process-store";
import { useUploadFormStore } from "@/stores/upload-form-store";

let queuePromise: Promise<void> | null = null;

export function useUpload() {
  const queryClient = useQueryClient();

  const startUpload = useCallback(() => {
    const formStore = useUploadFormStore.getState();
    const { formState } = formStore;

    if (!formState.files?.length || !formState.channel) {
      addToast({
        title: "Upload is not ready",
        description: "Select at least one file and a Slack channel.",
        color: "warning",
      });

      return;
    }

    const files = Array.from(formState.files);
    const batchSize = Math.max(1, Math.min(formState.messageBatchSize, 10));
    const uploadSessionId = formState.uploadSessionId || crypto.randomUUID();
    const job: UploadJob = {
      id: crypto.randomUUID(),
      uploadSessionId,
      files,
      totalFiles: files.length,
      completedFiles: 0,
      channel: formState.channel,
      comment: formState.comment,
      batchSize,
      currentBatch: 0,
      totalBatches: Math.ceil(files.length / batchSize),
      status: "queued",
      detail: "Waiting to start",
      createdAt: Date.now(),
    };

    useUploadProcessStore.getState().enqueueJob(job);
    formStore.resetAfterQueue();
    startQueue(queryClient);
  }, [queryClient]);

  return { startUpload };
}

function startQueue(queryClient: QueryClient) {
  if (queuePromise) return;

  queuePromise = drainQueue(queryClient).finally(() => {
    queuePromise = null;

    const hasQueuedJobs = useUploadProcessStore
      .getState()
      .jobs.some((job) => job.status === "queued");

    if (hasQueuedJobs) {
      startQueue(queryClient);
    }
  });
}

async function drainQueue(queryClient: QueryClient) {
  const store = useUploadProcessStore.getState();

  store.setQueueRunning(true);

  try {
    while (true) {
      const job = useUploadProcessStore
        .getState()
        .jobs.find((candidate) => candidate.status === "queued");

      if (!job) break;

      useUploadProcessStore.getState().startJob(job.id);

      try {
        for (
          let fileIndex = 0;
          fileIndex < job.files.length;
          fileIndex += job.batchSize
        ) {
          const batch = job.files.slice(fileIndex, fileIndex + job.batchSize);
          const currentBatch = Math.floor(fileIndex / job.batchSize) + 1;

          useUploadProcessStore.getState().updateJob(job.id, {
            currentBatch,
            detail: `Sending batch ${currentBatch} of ${job.totalBatches} to Slack`,
          });

          await client.upload.uploadBatchToServer(
            batch,
            job.channel,
            job.comment,
            job.uploadSessionId,
          );

          useUploadProcessStore.getState().updateJob(job.id, {
            completedFiles: Math.min(fileIndex + batch.length, job.totalFiles),
          });
        }

        useUploadProcessStore.getState().updateJob(job.id, {
          detail: "Refreshing the image library",
        });
        useUploadProcessStore.getState().finishJob(job.id, "completed");
        await queryClient.invalidateQueries({ queryKey: ["files"] });

        addToast({
          title: "Upload complete",
          description: `${job.totalFiles} file${job.totalFiles === 1 ? "" : "s"} uploaded to Slack.`,
          color: "success",
          timeout: 5000,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Upload failed unexpectedly";

        useUploadProcessStore.getState().finishJob(job.id, "failed", message);
        addToast({
          title: "Upload failed",
          description: message,
          color: "danger",
          timeout: 7000,
        });
      }
    }
  } finally {
    useUploadProcessStore.getState().setQueueRunning(false);
  }
}
