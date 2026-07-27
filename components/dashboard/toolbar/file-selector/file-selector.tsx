"use client";

import { memo, useCallback } from "react";
import { Input } from "@heroui/input";

import { FileSelectorCard } from "./file-selector-card";

import { useFileHandlers } from "@/hooks/use-file-handlers";
import { useDrawerStore } from "@/stores/drawer-store";

export const FileSelector = memo(function FileSelector() {
  const {
    acceptedFileTypes,
    fileCount,
    filesInputRef,
    handleFilesChange,
    clearSelection,
    inputKey,
  } = useFileHandlers();
  const isDrawerOpen = useDrawerStore(
    (state) => state.isOpen || state.isAnimating,
  );

  const openFilePicker = useCallback(() => {
    filesInputRef.current?.click();
  }, [filesInputRef]);

  return (
    <div className="flex w-full flex-col items-center">
      <FileSelectorCard
        activeTab="files"
        clearSelection={clearSelection}
        fileCount={fileCount}
        handleCardPress={openFilePicker}
        isDisabled={isDrawerOpen}
        isSelected={fileCount > 0}
        slideDirection={0}
      />
      <p className="mt-1 text-center text-xs text-gray-500 dark:text-gray-400">
        Accepted file types: {acceptedFileTypes.join(", ")}
      </p>
      <Input
        key={`files-${inputKey}`}
        ref={filesInputRef}
        multiple
        accept={acceptedFileTypes.join(",")}
        aria-hidden="true"
        className="hidden"
        isDisabled={isDrawerOpen}
        type="file"
        onChange={handleFilesChange}
      />
    </div>
  );
});
