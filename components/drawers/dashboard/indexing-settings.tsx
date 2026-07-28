"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { ArrowClockwise, Database, Pause, Play } from "@phosphor-icons/react";

interface IndexingStatus {
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
  lastIndexedAt: string | null;
}

type IndexingAction =
  | "enqueue_recent"
  | "enqueue_all"
  | "pause"
  | "resume"
  | "retry_failed";

interface IndexingResponse {
  status?: IndexingStatus;
  error?: string;
}

export function IndexingSettings() {
  const [status, setStatus] = useState<IndexingStatus | null>(null);
  const [activeAction, setActiveAction] = useState<IndexingAction | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/indexing", {
        cache: "no-store",
        signal,
      });
      const payload = (await response.json()) as IndexingResponse;

      if (!response.ok || !payload.status) {
        throw new Error(payload.error || "Indexing status is unavailable.");
      }

      setStatus(payload.status);
      setMessage(null);
    } catch (error) {
      if (signal?.aborted) return;

      setMessage(
        error instanceof Error
          ? error.message
          : "Indexing status is unavailable.",
      );
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void refresh(controller.signal);
    const interval = window.setInterval(() => {
      void refresh(controller.signal);
    }, 3_000);

    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [refresh]);

  const progress = useMemo(() => {
    if (!status?.totalImages) return 0;

    return Math.min(100, (status.indexed / status.totalImages) * 100);
  }, [status]);
  const queuedCount =
    (status?.queuedJobs ?? 0) + (status?.activeBackfills ?? 0);
  const processingCount = Math.max(
    status?.processing ?? 0,
    status?.activeJobs ?? 0,
  );
  const hasOutstandingWork = queuedCount > 0 || processingCount > 0;
  const libraryNeedsIndexing =
    (status?.unindexed ?? 0) + (status?.failed ?? 0) > 0;
  const workerState = getWorkerState(status, hasOutstandingWork);

  const runAction = async (
    action: IndexingAction,
    successMessage: string,
    limit?: number,
  ) => {
    setActiveAction(action);
    setMessage(null);

    try {
      const response = await fetch("/api/indexing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ...(action === "enqueue_recent" ? { limit: limit ?? 100 } : {}),
        }),
      });
      const payload = (await response.json()) as IndexingResponse;

      if (!response.ok || !payload.status) {
        throw new Error(payload.error || "The indexing action failed.");
      }

      setStatus(payload.status);
      setMessage(successMessage);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "The indexing action failed.",
      );
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Database className="text-primary-500" size={20} />
          <h3 className="font-semibold">Semantic indexing</h3>
        </div>
        <div
          className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300"
          role="status"
        >
          <span
            className={`h-2 w-2 rounded-full ${workerState.dotClassName}`}
          />
          {workerState.label}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-2xl font-semibold tabular-nums">
              {status?.indexed ?? 0}
              <span className="text-sm font-normal text-zinc-500">
                {" "}
                / {status?.totalImages ?? 0}
              </span>
            </p>
            <p className="text-xs text-zinc-500">images searchable</p>
          </div>
          <p className="text-xs font-medium text-zinc-500">
            {Math.round(progress)}%
          </p>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-primary-500 transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

      </div>

      {status?.isPaused ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
          Indexing is paused. The current image may finish before the worker
          stops claiming jobs. Resume continues the same queued plan.
        </p>
      ) : null}

      {message ? (
        <p className="rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {message}
        </p>
      ) : null}

      <div className="grid grid-cols-3 gap-2">
        <Button
          className="min-w-0 px-2"
          isDisabled={!libraryNeedsIndexing || hasOutstandingWork}
          isLoading={activeAction === "enqueue_recent"}
          size="sm"
          variant="bordered"
          onPress={() =>
            runAction(
              "enqueue_recent",
              "The newest 100 images were added to the indexing queue.",
              100,
            )
          }
        >
          Newest 100
        </Button>
        <Button
          className="min-w-0 px-2"
          isDisabled={!libraryNeedsIndexing || hasOutstandingWork}
          isLoading={activeAction === "enqueue_recent"}
          size="sm"
          variant="bordered"
          onPress={() =>
            runAction(
              "enqueue_recent",
              "The newest 500 images were added to the indexing queue.",
              500,
            )
          }
        >
          Newest 500
        </Button>
        <Button
          className="min-w-0 px-2"
          color="primary"
          isDisabled={!libraryNeedsIndexing || hasOutstandingWork}
          isLoading={activeAction === "enqueue_all"}
          size="sm"
          variant="flat"
          onPress={() =>
            runAction(
              "enqueue_all",
              "The full-library indexing request was queued.",
            )
          }
        >
          All images
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          className="flex-1"
          isDisabled={!status || (!hasOutstandingWork && !status.isPaused)}
          isLoading={activeAction === (status?.isPaused ? "resume" : "pause")}
          size="sm"
          startContent={
            status?.isPaused ? <Play size={16} /> : <Pause size={16} />
          }
          variant="light"
          onPress={() =>
            runAction(
              status?.isPaused ? "resume" : "pause",
              status?.isPaused
                ? "Indexing resumed."
                : "Indexing will pause after the current image.",
            )
          }
        >
          {status?.isPaused ? "Resume indexing" : "Pause indexing"}
        </Button>
        {(status?.failed ?? 0) > 0 ? (
          <Button
            className="flex-1"
            isLoading={activeAction === "retry_failed"}
            size="sm"
            startContent={<ArrowClockwise size={16} />}
            variant="light"
            onPress={() =>
              runAction("retry_failed", "Failed images were queued again.")
            }
          >
            Retry failed
          </Button>
        ) : null}
      </div>

    </section>
  );
}

function getWorkerState(
  status: IndexingStatus | null,
  hasOutstandingWork: boolean,
) {
  if (!status) {
    return {
      label: "Checking",
      dotClassName: "bg-zinc-400 dark:bg-zinc-500",
    };
  }
  if (status.isPaused) {
    return { label: "Paused", dotClassName: "bg-amber-500" };
  }
  if (status.workerOnline && hasOutstandingWork) {
    return {
      label: "Indexing",
      dotClassName: "animate-pulse bg-emerald-500",
    };
  }
  if (status.workerOnline) {
    return { label: "Ready", dotClassName: "bg-sky-500" };
  }
  if (hasOutstandingWork) {
    return { label: "Unavailable", dotClassName: "bg-red-500" };
  }

  return {
    label: "Stopped",
    dotClassName: "bg-zinc-400 dark:bg-zinc-500",
  };
}
