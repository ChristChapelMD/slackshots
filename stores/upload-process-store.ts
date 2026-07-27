import { create } from "zustand";

export type UploadJobStatus = "queued" | "uploading" | "completed" | "failed";

export interface UploadJob {
  id: string;
  uploadSessionId: string;
  files: File[];
  totalFiles: number;
  completedFiles: number;
  channel: string;
  comment: string;
  batchSize: number;
  currentBatch: number;
  totalBatches: number;
  status: UploadJobStatus;
  detail: string;
  error?: string;
  createdAt: number;
}

interface UploadProcessState {
  jobs: UploadJob[];
  activeJobId: string | null;
  isUploading: boolean;
  uploadProgress: number;
  enqueueJob: (job: UploadJob) => void;
  startJob: (jobId: string) => void;
  updateJob: (jobId: string, update: Partial<UploadJob>) => void;
  finishJob: (
    jobId: string,
    status: Extract<UploadJobStatus, "completed" | "failed">,
    error?: string,
  ) => void;
  setQueueRunning: (running: boolean) => void;
  dismissJob: (jobId: string) => void;
  clearFinished: () => void;
}

export const useUploadProcessStore = create<UploadProcessState>((set) => ({
  jobs: [],
  activeJobId: null,
  isUploading: false,
  uploadProgress: 0,

  enqueueJob: (job) =>
    set((state) => ({
      jobs: [...state.jobs, job],
    })),

  startJob: (jobId) =>
    set((state) => ({
      activeJobId: jobId,
      isUploading: true,
      uploadProgress: 0,
      jobs: state.jobs.map((job) =>
        job.id === jobId
          ? { ...job, status: "uploading", detail: "Preparing files" }
          : job,
      ),
    })),

  updateJob: (jobId, update) =>
    set((state) => {
      const jobs = state.jobs.map((job) =>
        job.id === jobId ? { ...job, ...update } : job,
      );
      const activeJob = jobs.find((job) => job.id === state.activeJobId);

      return {
        jobs,
        uploadProgress: activeJob
          ? Math.round((activeJob.completedFiles / activeJob.totalFiles) * 100)
          : state.uploadProgress,
      };
    }),

  finishJob: (jobId, status, error) =>
    set((state) => ({
      activeJobId: state.activeJobId === jobId ? null : state.activeJobId,
      uploadProgress: status === "completed" ? 100 : state.uploadProgress,
      jobs: state.jobs.map((job) =>
        job.id === jobId
          ? {
              ...job,
              files: [],
              status,
              error,
              completedFiles:
                status === "completed" ? job.totalFiles : job.completedFiles,
            }
          : job,
      ),
    })),

  setQueueRunning: (running) =>
    set({
      isUploading: running,
      ...(!running ? { activeJobId: null, uploadProgress: 0 } : {}),
    }),

  dismissJob: (jobId) =>
    set((state) => ({
      jobs: state.jobs.filter((job) => job.id !== jobId),
    })),

  clearFinished: () =>
    set((state) => ({
      jobs: state.jobs.filter(
        (job) => job.status === "queued" || job.status === "uploading",
      ),
    })),
}));
