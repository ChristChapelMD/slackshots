import React, { Suspense, useMemo, memo } from "react";
import { Skeleton } from "@heroui/skeleton";

import { useUIStore } from "@/stores/ui-store";
import { FileItem } from "@/types/service-types/file-service";
import { fileTypeRegistry } from "@/lib/file-types/file-type-registry";
import { ViewMode } from "@/lib/file-types/handlers/file-type-handler";
import { initializeFileTypeRegistry } from "@/lib/file-types";

initializeFileTypeRegistry();

export const FileRenderer = memo(
  ({
    item,
    viewMode: forcedViewMode,
  }: {
    item: FileItem;
    viewMode?: ViewMode;
  }) => {
    const defaultViewMode = useUIStore((state) => state.viewMode);
    const viewMode = forcedViewMode || defaultViewMode;

    const Component = useMemo(() => {
      const handler = item.fileType
        ? fileTypeRegistry.getHandlerForMimeType(item.fileType)
        : fileTypeRegistry.getHandlerForExtension(
            item.fileName.split(".").pop() || "",
          );

      if (!handler) {
        return null;
      }

      switch (viewMode) {
        case "grid":
          return handler.getGridRenderer?.() || handler.getRenderer();
        case "list":
          return handler.getListRenderer?.() || handler.getRenderer();
        case "detail":
          return handler.getDetailRenderer?.() || handler.getRenderer();
        case "preview":
          return handler.getPreviewRenderer?.() || handler.getRenderer();
        default:
          return handler.getRenderer();
      }
    }, [item._id, item.fileType, item.fileName, viewMode]);

    if (!Component) {
      return (
        <Skeleton className="h-full w-full" isLoaded={false}>
          <div className="h-full w-full" />
        </Skeleton>
      );
    }

    return (
      <Suspense
        fallback={
          <Skeleton className="h-full w-full" isLoaded={false}>
            <div className="h-full w-full" />
          </Skeleton>
        }
      >
        <Component item={item} />
      </Suspense>
    );
  },
);

FileRenderer.displayName = "FileRenderer";
