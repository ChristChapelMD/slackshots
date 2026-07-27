import { create } from "zustand";

interface UploadFormState {
  files: FileList | null;
  channel: string;
  comment: string;
  messageBatchSize: number;
  fileTypes: string[];
  uploadSessionId: string;
  fileSelection: string;
}

interface UploadFormStore {
  formState: UploadFormState;
  updateForm: (update: Partial<UploadFormState>) => void;
  setFiles: (files: FileList | null) => void;
  setFileSelection: (selection: string) => void;
  resetForm: () => void;
  resetAfterQueue: () => void;
}

const initialState: UploadFormState = {
  files: null,
  channel: "",
  comment: "",
  messageBatchSize: 10,
  fileTypes: [".jpg", ".jpeg", ".png"],
  uploadSessionId: "",
  fileSelection: "",
};

export const useUploadFormStore = create<UploadFormStore>((set) => ({
  formState: initialState,

  updateForm: (update) =>
    set((state) => ({
      formState: { ...state.formState, ...update },
    })),

  setFiles: (files) =>
    set((state) => ({
      formState: { ...state.formState, files },
    })),

  setFileSelection: (fileSelection) =>
    set((state) => ({
      formState: { ...state.formState, fileSelection },
    })),

  resetForm: () =>
    set({
      formState: { ...initialState, uploadSessionId: crypto.randomUUID() },
    }),
  resetAfterQueue: () =>
    set((state) => ({
      formState: {
        ...state.formState,
        files: null,
        comment: "",
        uploadSessionId: crypto.randomUUID(),
        fileSelection: "",
      },
    })),
}));
