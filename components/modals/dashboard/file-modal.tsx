"use client";

import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

import { useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@heroui/button";
import { Modal, ModalContent } from "@heroui/modal";
import {
  ArrowCounterClockwise,
  DownloadSimple,
  ImageBroken,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  X,
} from "@phosphor-icons/react";

import { useFileModalStore } from "@/stores/file-modal-store";
import { useFileDownload } from "@/hooks/use-file-download";
import { formatDate, formatFileSize } from "@/lib/utils/format-utils";
import { cn } from "@/lib/utils";

interface FileModalProps {
  containerRef: RefObject<HTMLDivElement>;
}

interface Point {
  x: number;
  y: number;
}

interface CanvasSize {
  width: number;
  height: number;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const ZOOM_STEP = 0.5;

export function FileModal({ containerRef }: FileModalProps) {
  const item = useFileModalStore((state) => state.item);
  const closeFile = useFileModalStore((state) => state.closeFile);
  const { downloadSingleFile } = useFileDownload();
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    start: Point;
    origin: Point;
  } | null>(null);
  const [isPortalReady, setIsPortalReady] = useState(false);
  const [isFullResolutionReady, setIsFullResolutionReady] = useState(false);
  const [thumbnailHasError, setThumbnailHasError] = useState(false);
  const [fullResolutionHasError, setFullResolutionHasError] = useState(false);
  const [naturalSize, setNaturalSize] = useState<CanvasSize | null>(null);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({
    width: 0,
    height: 0,
  });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const providerFileId = item?.uploads?.[0]?.providerFileId;
  const fullResolutionUrl = providerFileId
    ? `/api/files/${providerFileId}`
    : null;
  const thumbnailUrl = providerFileId
    ? `/api/files/${providerFileId}?variant=thumbnail`
    : null;
  const width = item?.metadata?.width || naturalSize?.width || 1600;
  const height = item?.metadata?.height || naturalSize?.height || 1200;
  const previewHasFailed =
    !fullResolutionUrl || (thumbnailHasError && fullResolutionHasError);

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const frame = requestAnimationFrame(() => setIsPortalReady(true));

    return () => cancelAnimationFrame(frame);
  }, [containerRef]);

  useLayoutEffect(() => {
    setIsFullResolutionReady(false);
    setThumbnailHasError(false);
    setFullResolutionHasError(false);
    setNaturalSize(null);
    setZoom(MIN_ZOOM);
    setPosition({ x: 0, y: 0 });
    setIsDragging(false);
    dragRef.current = null;
  }, [item?._id]);

  useLayoutEffect(() => {
    const stage = stageRef.current;

    if (!stage || !item) return;

    const fitCanvas = () => {
      const availableWidth = stage.clientWidth;
      const availableHeight = stage.clientHeight;
      const imageRatio = width / height;
      const stageRatio = availableWidth / availableHeight;

      if (imageRatio >= stageRatio) {
        setCanvasSize({
          width: availableWidth,
          height: availableWidth / imageRatio,
        });
      } else {
        setCanvasSize({
          width: availableHeight * imageRatio,
          height: availableHeight,
        });
      }
      setPosition({ x: 0, y: 0 });
    };

    const observer = new ResizeObserver(fitCanvas);

    fitCanvas();
    observer.observe(stage);

    return () => observer.disconnect();
  }, [height, item, width]);

  useLayoutEffect(() => {
    const stage = stageRef.current;

    if (!stage || !item) return;

    const handleNativeWheel = (event: globalThis.WheelEvent) => {
      event.preventDefault();

      const bounds = stage.getBoundingClientRect();
      const focus = {
        x: event.clientX - bounds.left - bounds.width / 2,
        y: event.clientY - bounds.top - bounds.height / 2,
      };
      const sensitivity = event.ctrlKey ? 0.01 : 0.0025;
      const nextZoom = clamp(
        zoom * Math.exp(-event.deltaY * sensitivity),
        MIN_ZOOM,
        MAX_ZOOM,
      );
      const imagePoint = {
        x: (focus.x - position.x) / zoom,
        y: (focus.y - position.y) / zoom,
      };
      const candidate = {
        x: focus.x - imagePoint.x * nextZoom,
        y: focus.y - imagePoint.y * nextZoom,
      };
      const maxX = Math.max(
        0,
        (canvasSize.width * nextZoom - stage.clientWidth) / 2,
      );
      const maxY = Math.max(
        0,
        (canvasSize.height * nextZoom - stage.clientHeight) / 2,
      );

      setZoom(nextZoom);
      setPosition({
        x: clamp(candidate.x, -maxX, maxX),
        y: clamp(candidate.y, -maxY, maxY),
      });
    };

    stage.addEventListener("wheel", handleNativeWheel, { passive: false });

    return () => stage.removeEventListener("wheel", handleNativeWheel);
  }, [canvasSize.height, canvasSize.width, item, position.x, position.y, zoom]);

  if (!isPortalReady || !containerRef.current) {
    return null;
  }

  const constrainPosition = (candidate: Point, nextZoom: number): Point => {
    const stage = stageRef.current;

    if (!stage || nextZoom <= MIN_ZOOM) {
      return { x: 0, y: 0 };
    }

    const maxX = Math.max(
      0,
      (canvasSize.width * nextZoom - stage.clientWidth) / 2,
    );
    const maxY = Math.max(
      0,
      (canvasSize.height * nextZoom - stage.clientHeight) / 2,
    );

    return {
      x: clamp(candidate.x, -maxX, maxX),
      y: clamp(candidate.y, -maxY, maxY),
    };
  };

  const updateZoom = (nextZoomValue: number, focus?: Point) => {
    const nextZoom = clamp(nextZoomValue, MIN_ZOOM, MAX_ZOOM);
    let nextPosition = position;

    if (focus && zoom > 0) {
      const imagePoint = {
        x: (focus.x - position.x) / zoom,
        y: (focus.y - position.y) / zoom,
      };

      nextPosition = {
        x: focus.x - imagePoint.x * nextZoom,
        y: focus.y - imagePoint.y * nextZoom,
      };
    }

    setZoom(nextZoom);
    setPosition(constrainPosition(nextPosition, nextZoom));
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (zoom <= MIN_ZOOM || event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      origin: position,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) return;

    setPosition(
      constrainPosition(
        {
          x: drag.origin.x + event.clientX - drag.start.x,
          y: drag.origin.y + event.clientY - drag.start.y,
        },
        zoom,
      ),
    );
  };

  const stopDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setIsDragging(false);
  };

  const resetView = () => {
    setZoom(MIN_ZOOM);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <Modal
      hideCloseButton
      backdrop="blur"
      classNames={{
        wrapper:
          "!absolute !inset-0 !h-full !w-full flex items-center justify-center p-0",
        backdrop: "!absolute !inset-0 !h-full !w-full",
        base: "!m-0 !h-[calc(100%_-_12px)] !min-h-0 !w-[calc(100%_-_12px)] !max-w-none !overflow-visible !rounded-none !bg-transparent !shadow-none",
      }}
      isOpen={Boolean(item)}
      placement="center"
      portalContainer={containerRef.current}
      radius="none"
      scrollBehavior="normal"
      shadow="none"
      size="full"
      onOpenChange={(open) => {
        if (!open) closeFile();
      }}
    >
      <ModalContent
        className="!m-0 !h-[calc(100%_-_12px)] !min-h-0 !w-[calc(100%_-_12px)] !max-w-none !overflow-visible !rounded-none !bg-transparent !shadow-none"
        style={{
          width: "calc(100% - 12px)",
          maxWidth: "none",
          height: "calc(100% - 12px)",
          minHeight: 0,
          margin: 0,
          overflow: "visible",
          borderRadius: 0,
          background: "transparent",
          boxShadow: "none",
        }}
        onClick={(event) => {
          const target = event.target;

          if (
            target instanceof Element &&
            !target.closest("[data-file-viewer-content]")
          ) {
            closeFile();
          }
        }}
      >
        {item && (
          <div className="flex h-full min-h-0 w-full flex-col gap-2 overflow-visible py-20">
            <div
              ref={stageRef}
              aria-label="Zoomable image preview"
              className={cn(
                "relative flex min-h-0 flex-1 items-center justify-center overflow-hidden",
                zoom > MIN_ZOOM
                  ? isDragging
                    ? "cursor-grabbing"
                    : "cursor-grab"
                  : "cursor-zoom-in",
              )}
              role="img"
              style={{ touchAction: "none" }}
              onPointerCancel={stopDragging}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={stopDragging}
            >
              {previewHasFailed ? (
                <div className="flex h-80 w-[min(75vw,640px)] items-center justify-center rounded-2xl bg-zinc-950 text-zinc-400">
                  <div className="flex flex-col items-center gap-3">
                    <ImageBroken size={42} />
                    <p>Unable to preview this image.</p>
                  </div>
                </div>
              ) : (
                <div
                  data-file-viewer-content
                  className="relative overflow-hidden rounded-2xl shadow-2xl will-change-transform"
                  style={{
                    width: `${canvasSize.width}px`,
                    height: `${canvasSize.height}px`,
                    transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${zoom})`,
                    transformOrigin: "center",
                  }}
                >
                  {thumbnailUrl ? (
                    <Image
                      fill
                      priority
                      unoptimized
                      alt=""
                      aria-hidden="true"
                      className={cn(
                        "object-contain transition duration-500",
                        thumbnailHasError || isFullResolutionReady
                          ? "opacity-0"
                          : fullResolutionHasError
                            ? "scale-100 blur-none"
                            : "scale-[1.015] blur-[3px]",
                      )}
                      draggable={false}
                      sizes="(max-width: 768px) 94vw, 82vw"
                      src={thumbnailUrl}
                      onError={() => setThumbnailHasError(true)}
                    />
                  ) : null}
                  {fullResolutionUrl && !fullResolutionHasError ? (
                    <Image
                      fill
                      unoptimized
                      alt={item.fileName}
                      className={cn(
                        "object-contain transition-opacity duration-500",
                        isFullResolutionReady ? "opacity-100" : "opacity-0",
                      )}
                      draggable={false}
                      sizes="(max-width: 768px) 94vw, 82vw"
                      src={fullResolutionUrl}
                      onError={() => setFullResolutionHasError(true)}
                      onLoad={(event) => {
                        setNaturalSize({
                          width: event.currentTarget.naturalWidth,
                          height: event.currentTarget.naturalHeight,
                        });
                        setIsFullResolutionReady(true);
                      }}
                    />
                  ) : null}
                </div>
              )}
            </div>

            <div
              data-file-viewer-content
              className="flex h-11 shrink-0 self-center items-center overflow-hidden rounded-xl border border-zinc-200/80 bg-white/95 px-1.5 shadow-lg backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95"
              style={{ width: "75%" }}
            >
              <div className="flex min-w-0 flex-1 items-center divide-x divide-zinc-200 overflow-hidden dark:divide-zinc-700">
                <ViewerField
                  className="flex-1"
                  label="File"
                  value={item.fileName}
                />
                <ViewerField
                  className="shrink-0"
                  label="Dimensions"
                  value={`${width} × ${height}px`}
                />
                <ViewerField
                  className="shrink-0"
                  label="Size"
                  value={formatFileSize(item.fileSize)}
                />
                <ViewerField
                  className="shrink-0"
                  label="Type"
                  value={item.fileType}
                />
                <ViewerField
                  className="max-w-32 shrink-0"
                  label="By"
                  value={item.uploadedBy?.name || "Unknown"}
                />
                <ViewerField
                  className="shrink-0"
                  label="Uploaded"
                  value={
                    item.createdAt ? formatDate(item.createdAt) : "Unknown"
                  }
                />
              </div>

              <div className="ml-1.5 flex shrink-0 items-center gap-0.5 border-l border-zinc-200 pl-1.5 dark:border-zinc-700">
                <div className="flex items-center rounded-md bg-zinc-100 dark:bg-zinc-800">
                  <Button
                    isIconOnly
                    aria-label="Zoom out"
                    isDisabled={zoom <= MIN_ZOOM}
                    size="sm"
                    variant="light"
                    onPress={() => updateZoom(zoom - ZOOM_STEP)}
                  >
                    <MagnifyingGlassMinus size={18} />
                  </Button>
                  <span className="w-11 text-center text-xs font-medium tabular-nums text-zinc-600 dark:text-zinc-300">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    isIconOnly
                    aria-label="Zoom in"
                    isDisabled={zoom >= MAX_ZOOM}
                    size="sm"
                    variant="light"
                    onPress={() => updateZoom(zoom + ZOOM_STEP)}
                  >
                    <MagnifyingGlassPlus size={18} />
                  </Button>
                  <Button
                    isIconOnly
                    aria-label="Reset zoom and position"
                    isDisabled={
                      zoom === MIN_ZOOM && position.x === 0 && position.y === 0
                    }
                    size="sm"
                    variant="light"
                    onPress={resetView}
                  >
                    <ArrowCounterClockwise size={18} />
                  </Button>
                </div>
                <Button
                  isIconOnly
                  aria-label={`Download ${item.fileName}`}
                  size="sm"
                  variant="light"
                  onPress={() => downloadSingleFile(item)}
                >
                  <DownloadSimple size={18} />
                </Button>
                <Button
                  isIconOnly
                  aria-label="Close image preview"
                  size="sm"
                  variant="light"
                  onPress={closeFile}
                >
                  <X size={18} />
                </Button>
              </div>
            </div>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}

function ViewerField({
  className,
  label,
  value,
}: {
  className?: string;
  label: string;
  value: string;
}) {
  return (
    <div
      className={cn("flex min-w-0 items-baseline gap-1.5 px-2.5", className)}
    >
      <span className="shrink-0 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      <span
        className="truncate text-xs font-semibold text-zinc-800 dark:text-zinc-100"
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
