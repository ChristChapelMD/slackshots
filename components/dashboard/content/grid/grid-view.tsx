"use client";

import type { RefObject } from "react";

import { useEffect, useMemo, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import GridItem from "./grid-item";

import { useUIStore } from "@/stores/ui-store";
import LoadingAnimation from "@/components/ui/loading-animation";
import { FileItem } from "@/types/service-types/file-service";

interface GridViewProps {
  files: FileItem[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  scrollContainerRef: RefObject<HTMLDivElement>;
}

const GAP = 12;

export function GridView({
  files,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  onLoadMore,
  scrollContainerRef,
}: GridViewProps) {
  const gridDensity = useUIStore((state) => state.gridDensity);
  const viewMode = useUIStore((state) => state.viewMode);
  const [containerWidth, setContainerWidth] = useState(900);

  useEffect(() => {
    const container = scrollContainerRef.current;

    if (!container) return;

    const updateWidth = () => {
      setContainerWidth(Math.max(280, container.clientWidth - 32));
    };
    const observer = new ResizeObserver(updateWidth);

    updateWidth();
    observer.observe(container);

    return () => observer.disconnect();
  }, [scrollContainerRef]);

  const columns = getColumnCount(containerWidth, gridDensity);
  const rowCount = Math.ceil(files.length / columns);
  const estimatedCellSize = (containerWidth - GAP * (columns - 1)) / columns;
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => estimatedCellSize,
    gap: GAP,
    overscan: 4,
  });

  const rows = useMemo(
    () =>
      Array.from({ length: rowCount }, (_, rowIndex) =>
        files.slice(rowIndex * columns, rowIndex * columns + columns),
      ),
    [files, rowCount, columns],
  );
  const virtualRows = rowVirtualizer.getVirtualItems();
  const lastVirtualRowIndex = virtualRows.at(-1)?.index ?? -1;

  useEffect(() => {
    if (
      hasNextPage &&
      !isFetchingNextPage &&
      lastVirtualRowIndex >= 0 &&
      rowCount - lastVirtualRowIndex <= 5
    ) {
      onLoadMore();
    }
  }, [
    hasNextPage,
    isFetchingNextPage,
    lastVirtualRowIndex,
    onLoadMore,
    rowCount,
  ]);

  if (isLoading && files.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingAnimation />
      </div>
    );
  }

  if (!isLoading && files.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-4xl font-light text-zinc-500 dark:text-zinc-400">
          No files found
        </p>
      </div>
    );
  }

  if (viewMode !== "grid") {
    return null;
  }

  return (
    <>
      <div
        className="relative w-full"
        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
      >
        {virtualRows.map((virtualRow) => (
          <div
            key={virtualRow.key}
            className="absolute left-0 top-0 w-full"
            data-index={virtualRow.index}
            style={{
              height: `${estimatedCellSize}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <div
              className="grid h-full w-full gap-3"
              style={{
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              }}
            >
              {rows[virtualRow.index]?.map((item) => (
                <GridItem key={item._id} item={item} items={files} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function getColumnCount(width: number, density: "lo" | "md" | "hi"): number {
  if (width < 560) {
    return density === "lo" ? 1 : density === "md" ? 2 : 3;
  }
  if (width < 760) {
    return density === "lo" ? 2 : density === "md" ? 3 : 4;
  }
  if (width < 1020) {
    return density === "lo" ? 3 : density === "md" ? 4 : 5;
  }
  if (width < 1280) {
    return density === "lo" ? 4 : density === "md" ? 5 : 7;
  }

  return density === "lo" ? 4 : density === "md" ? 6 : 8;
}
