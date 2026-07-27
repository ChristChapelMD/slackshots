import { useState, useCallback } from "react";

import { useDrawerStore } from "@/stores/drawer-store";
import { useSelectionStore } from "@/stores/selection-store";
import { FileItem } from "@/types/service-types/file-service";
import { useUploadProcessStore } from "@/stores/upload-process-store";
import { useFileModalStore } from "@/stores/file-modal-store";

export function useGridItemInteraction(item: FileItem) {
  const [isHovered, setIsHovered] = useState(false);

  const isSelectMode = useSelectionStore((state) => state.isSelectMode);
  const selectedFiles = useSelectionStore((state) => state.selectedFiles);
  const toggleFileSelection = useSelectionStore(
    (state) => state.toggleFileSelection,
  );
  const isUploading = useUploadProcessStore((state) => state.isUploading);
  const isOpen = useDrawerStore((state) => state.isOpen);
  const isAnimating = useDrawerStore((state) => state.isAnimating);
  const openFile = useFileModalStore((state) => state.openFile);

  const isSelected = selectedFiles.some((file) => file._id === item._id);
  const isDrawerOpen = isOpen || isAnimating;
  const isDisabled = isDrawerOpen || isUploading;

  const handleMouseEnter = useCallback(() => {
    if (!isDisabled) {
      setIsHovered(true);
    }
  }, [isDisabled]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const handleItemInteraction = useCallback(() => {
    if (isSelectMode) {
      toggleFileSelection(item);
    } else {
      openFile(item);
    }
  }, [isSelectMode, toggleFileSelection, item, openFile]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        handleItemInteraction();
      }
    },
    [handleItemInteraction],
  );

  return {
    isHovered,
    isSelected,
    isDisabled,
    isSelectMode,
    handleMouseEnter,
    handleMouseLeave,
    handleItemInteraction,
    handleKeyDown,
  };
}
