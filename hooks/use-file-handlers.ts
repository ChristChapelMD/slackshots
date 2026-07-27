"use client";

import { useRef, useState, useCallback, useEffect } from "react";

import { useUploadFormStore } from "@/stores/upload-form-store";

export function useFileHandlers() {
  const acceptedFileTypes = useUploadFormStore(
    (state) => state.formState.fileTypes,
  );
  const setUploadFiles = useUploadFormStore((state) => state.setFiles);
  const selectedFiles = useUploadFormStore((state) => state.formState.files);
  const setFileSelection = useUploadFormStore(
    (state) => state.setFileSelection,
  );

  const [fileCount, setFileCount] = useState(0);
  const [inputKey, setInputKey] = useState(Date.now());
  const [selectionType, setSelectionType] = useState<"files" | "folder" | null>(
    null,
  );

  const folderInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedFiles && fileCount > 0) {
      setFileCount(0);
      setSelectionType(null);
      setInputKey(Date.now());
      if (filesInputRef.current) filesInputRef.current.value = "";
    }
  }, [selectedFiles, fileCount]);

  const clearSelection = useCallback(() => {
    setUploadFiles(null);
    setFileSelection("");
    setFileCount(0);
    setSelectionType(null);
    setInputKey(Date.now());
    if (folderInputRef.current) folderInputRef.current.value = "";
    if (filesInputRef.current) filesInputRef.current.value = "";
  }, [setUploadFiles, setFileSelection]);

  const handleFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (!files?.length) return clearSelection();

    setUploadFiles(files);
    setFileSelection(
      `${files.length} file${files.length !== 1 ? "s" : ""} selected`,
    );
    setFileCount(files.length);
    setSelectionType("files");
  };

  const handleFolderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (!files?.length) return clearSelection();

    const validFiles = Array.from(files).filter((file) =>
      acceptedFileTypes.some((type) => file.name.toLowerCase().endsWith(type)),
    );

    if (!validFiles.length) return clearSelection();

    const dataTransfer = new DataTransfer();

    validFiles.forEach((file) => dataTransfer.items.add(file));
    const filteredFiles = dataTransfer.files;

    setUploadFiles(filteredFiles);
    setFileSelection(
      `${filteredFiles.length} file${filteredFiles.length !== 1 ? "s" : ""} from folder`,
    );
    setFileCount(filteredFiles.length);
    setSelectionType("folder");
  };

  return {
    acceptedFileTypes,
    fileCount,
    selectionType,
    filesInputRef,
    folderInputRef,
    handleFilesChange,
    handleFolderChange,
    clearSelection,
    inputKey,
  };
}
