"use client";

import { useState } from "react";
import Image from "next/image";
import { FileText, Calendar } from "@phosphor-icons/react";

import { formatFileSize, formatDate } from "@/lib/utils/format-utils";
import { useSelectionStore } from "@/stores/selection-store";
import { FileItem } from "@/types/service-types/file-service";

interface ImageListDisplayProps {
  item: FileItem;
}

export default function ImageListDisplay({ item }: ImageListDisplayProps) {
  const [hasError, setHasError] = useState(false);

  const providerFileId = item.uploads?.[0]?.providerFileId;
  const imageUrl = providerFileId
    ? `/api/files/${providerFileId}?variant=thumbnail`
    : null;

  const isSelectMode = useSelectionStore((state) => state.isSelectMode);
  const selectedFiles = useSelectionStore((state) => state.selectedFiles);
  const isSelected = selectedFiles.some((file) => file._id === item._id);

  return (
    <div
      className={`px-4 py-3 border-b border-gray-200 dark:border-gray-700
        hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
        ${isSelected && isSelectMode ? "bg-primary-50 dark:bg-primary-900/20" : ""}`}
    >
      <div className="flex items-center space-x-4">
        <div className="relative w-12 h-12 flex-shrink-0 bg-gray-200 dark:bg-gray-700 rounded">
          {imageUrl && (
            <Image
              fill
              unoptimized
              alt={item.fileName || "File"}
              className="object-cover rounded"
              src={imageUrl}
              onError={() => setHasError(true)}
            />
          )}
          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <FileText size={20} />
            </div>
          )}
        </div>

        <div className="flex-grow min-w-0">
          <h3 className="text-sm font-medium truncate">{item.fileName}</h3>
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
            <span>{formatFileSize(item.fileSize)}</span>
            <span className="mx-2">•</span>
            <Calendar className="mr-1" size={14} />
            <span>
              {item.createdAt ? formatDate(item.createdAt) : "Unknown"}
            </span>
          </div>
        </div>

        {isSelectMode && (
          <div className="flex-shrink-0">
            <div
              className={`w-5 h-5 rounded-full border-2 ${
                isSelected
                  ? "bg-primary-500 border-white"
                  : "border-gray-300 dark:border-gray-600"
              }`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
