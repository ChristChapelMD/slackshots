import type { FileItem } from "@/types/service-types/file-service";

import { create } from "zustand";

interface FileModalState {
  item: FileItem | null;
  openFile: (item: FileItem) => void;
  closeFile: () => void;
}

export const useFileModalStore = create<FileModalState>((set) => ({
  item: null,
  openFile: (item) => set({ item }),
  closeFile: () => set({ item: null }),
}));
