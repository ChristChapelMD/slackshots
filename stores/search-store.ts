import { create } from "zustand";

interface SearchState {
  isOpen: boolean;
  isSuspended: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  suspendSearch: () => void;
  resumeSearch: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  isOpen: false,
  isSuspended: false,
  openSearch: () => set({ isOpen: true, isSuspended: false }),
  closeSearch: () => set({ isOpen: false, isSuspended: false }),
  suspendSearch: () => set({ isOpen: false, isSuspended: true }),
  resumeSearch: () =>
    set((state) =>
      state.isSuspended ? { isOpen: true, isSuspended: false } : state,
    ),
}));
