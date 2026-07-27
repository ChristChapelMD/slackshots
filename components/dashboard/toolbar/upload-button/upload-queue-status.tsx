"use client";

import { Button } from "@heroui/button";
import { CheckCircle, Trash, WarningCircle } from "@phosphor-icons/react";

import {
  UploadJob,
  useUploadProcessStore,
} from "@/stores/upload-process-store";
import LoadingAnimation from "@/components/ui/loading-animation";

export function UploadQueueStatus() {
  const jobs = useUploadProcessStore((state) => state.jobs);
  const dismissJob = useUploadProcessStore((state) => state.dismissJob);
  const clearFinished = useUploadProcessStore((state) => state.clearFinished);

  if (!jobs.length) return null;

  const visibleJobs = jobs.slice(-4).reverse();
  const hasFinishedJobs = jobs.some(
    (job) => job.status === "completed" || job.status === "failed",
  );

  return (
    <section
      aria-live="polite"
      className="space-y-2 rounded-xl border border-zinc-200 bg-white/80 p-3 dark:border-zinc-700 dark:bg-zinc-900/80"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Upload queue
        </h3>
        {hasFinishedJobs ? (
          <Button
            isIconOnly
            aria-label="Clear finished uploads"
            size="sm"
            variant="light"
            onPress={clearFinished}
          >
            <Trash size={15} />
          </Button>
        ) : null}
      </div>
      <div className="space-y-2">
        {visibleJobs.map((job) => (
          <UploadJobStatus
            key={job.id}
            job={job}
            onDismiss={() => dismissJob(job.id)}
          />
        ))}
      </div>
    </section>
  );
}

function UploadJobStatus({
  job,
  onDismiss,
}: {
  job: UploadJob;
  onDismiss: () => void;
}) {
  const progress = Math.round((job.completedFiles / job.totalFiles) * 100);
  const isFinished = job.status === "completed" || job.status === "failed";
  const icon =
    job.status === "completed" ? (
      <CheckCircle className="text-success" size={18} weight="fill" />
    ) : job.status === "failed" ? (
      <WarningCircle className="text-danger" size={18} weight="fill" />
    ) : (
      <LoadingAnimation size="micro" />
    );

  return (
    <div className="rounded-lg bg-zinc-100 p-2 dark:bg-zinc-800">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium capitalize">{job.status}</span>
            <span className="text-zinc-500">
              {job.completedFiles}/{job.totalFiles} files
            </span>
          </div>
          {job.status === "uploading" ? (
            <>
              <div
                aria-label="Upload progress"
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={progress}
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-300 dark:bg-zinc-700"
                role="progressbar"
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">
                {job.detail} · {progress}%
              </p>
            </>
          ) : null}
          {job.status === "queued" ? (
            <p className="mt-1 text-[11px] text-zinc-500">{job.detail}</p>
          ) : null}
          {job.error ? (
            <p className="mt-1 line-clamp-2 text-[11px] text-danger">
              {job.error}
            </p>
          ) : null}
        </div>
        {isFinished ? (
          <Button
            isIconOnly
            aria-label="Dismiss upload status"
            className="h-6 min-h-6 w-6 min-w-6"
            size="sm"
            variant="light"
            onPress={onDismiss}
          >
            ×
          </Button>
        ) : null}
      </div>
    </div>
  );
}
