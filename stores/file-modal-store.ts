import type { FileItem } from "@/types/service-types/file-service";

import { create } from "zustand";

export type FileModalSource = "grid" | "search" | "single";

interface OpenFileOptions {
  items?: FileItem[];
  source?: FileModalSource;
  returnToSearch?: boolean;
}

interface FileModalState {
  item: FileItem | null;
  items: FileItem[];
  currentIndex: number;
  source: FileModalSource;
  returnToSearch: boolean;
  openFile: (item: FileItem, options?: OpenFileOptions) => void;
  closeFile: () => void;
  showPrevious: () => void;
  showNext: () => void;
}

export const useFileModalStore = create<FileModalState>((set) => ({
  item: null,
  items: [],
  currentIndex: -1,
  source: "single",
  returnToSearch: false,
  openFile: (item, options = {}) =>
    set(() => {
      const items = options.items?.length ? options.items : [item];
      const requestedIndex = items.findIndex(
        (candidate) => candidate._id === item._id,
      );
      const currentIndex = requestedIndex >= 0 ? requestedIndex : 0;

      return {
        item: items[currentIndex] ?? item,
        items,
        currentIndex,
        source: options.source ?? "single",
        returnToSearch: options.returnToSearch ?? false,
      };
    }),
  closeFile: () =>
    set({
      item: null,
      items: [],
      currentIndex: -1,
      source: "single",
      returnToSearch: false,
    }),
  showPrevious: () =>
    set((state) => {
      if (state.currentIndex <= 0) return state;

      const currentIndex = state.currentIndex - 1;

      return {
        currentIndex,
        item: state.items[currentIndex] ?? state.item,
      };
    }),
  showNext: () =>
    set((state) => {
      if (
        state.currentIndex < 0 ||
        state.currentIndex >= state.items.length - 1
      ) {
        return state;
      }

      const currentIndex = state.currentIndex + 1;

      return {
        currentIndex,
        item: state.items[currentIndex] ?? state.item,
      };
    }),
}));
