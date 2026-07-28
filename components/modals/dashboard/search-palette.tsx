"use client";

import type { RefObject } from "react";
import type { FileItem } from "@/types/service-types/file-service";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Input } from "@heroui/input";
import { Modal, ModalContent } from "@heroui/modal";
import {
  ImageSquare,
  MagnifyingGlass,
  Sparkle,
  WarningCircle,
} from "@phosphor-icons/react";

import LoadingAnimation from "@/components/ui/loading-animation";
import { useFileModalStore } from "@/stores/file-modal-store";
import { useSearchStore } from "@/stores/search-store";

interface SearchPaletteProps {
  containerRef: RefObject<HTMLDivElement>;
}

interface SearchResult extends FileItem {
  score: number;
}

interface SearchResponse {
  backend: "atlas" | "exact";
  results: SearchResult[];
  error?: string;
}

export function SearchPalette({ containerRef }: SearchPaletteProps) {
  const isOpen = useSearchStore((state) => state.isOpen);
  const isSuspended = useSearchStore((state) => state.isSuspended);
  const closeSearch = useSearchStore((state) => state.closeSearch);
  const suspendSearch = useSearchStore((state) => state.suspendSearch);
  const openFile = useFileModalStore((state) => state.openFile);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [backend, setBackend] = useState<"atlas" | "exact" | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const normalizedQuery = query.trim();

  useEffect(() => {
    if (isOpen) {
      window.requestAnimationFrame(() => inputRef.current?.focus());

      return;
    }

    if (!isSuspended) {
      setQuery("");
      setResults([]);
      setError(null);
      setBackend(null);
      setActiveIndex(0);
    }
  }, [isOpen, isSuspended]);

  useEffect(() => {
    if (!isOpen || normalizedQuery.length < 2) {
      setResults([]);
      setError(null);
      setBackend(null);
      setIsSearching(false);

      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsSearching(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(normalizedQuery)}&limit=24`,
          {
            signal: controller.signal,
            cache: "no-store",
          },
        );
        const payload = (await response.json()) as SearchResponse;

        if (!response.ok) {
          throw new Error(payload.error || "Search is unavailable.");
        }

        setResults(payload.results);
        setBackend(payload.backend);
        setActiveIndex(0);
      } catch (searchError) {
        if (controller.signal.aborted) return;

        setResults([]);
        setBackend(null);
        setError(
          searchError instanceof Error
            ? searchError.message
            : "Search is unavailable.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [isOpen, normalizedQuery]);

  const selectedResult = useMemo(
    () => results[activeIndex],
    [activeIndex, results],
  );

  const openResult = (result: SearchResult) => {
    suspendSearch();
    window.setTimeout(
      () =>
        openFile(result, {
          items: results,
          source: "search",
          returnToSearch: true,
        }),
      0,
    );
  };

  return (
    <Modal
      hideCloseButton
      backdrop="blur"
      classNames={{
        wrapper:
          "!absolute !inset-0 !h-full !w-full items-start justify-center px-3 pt-3 sm:pt-4",
        backdrop: "!absolute !inset-0 !h-full !w-full",
        base: "!m-0 !max-h-[78%] !w-full !max-w-2xl overflow-hidden border border-zinc-200/80 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-zinc-700 dark:bg-zinc-900/95",
      }}
      isOpen={isOpen}
      placement="top-center"
      portalContainer={containerRef.current ?? undefined}
      scrollBehavior="inside"
      size="2xl"
      onOpenChange={(open) => {
        if (!open && !useSearchStore.getState().isSuspended) {
          closeSearch();
        }
      }}
    >
      <ModalContent>
        <div className="flex min-h-0 flex-col">
          <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
            <Input
              ref={inputRef}
              aria-label="Search Slack images"
              classNames={{
                input:
                  "h-11 text-base text-zinc-900 caret-zinc-900 placeholder:text-zinc-400 dark:text-zinc-100 dark:caret-white",
                inputWrapper:
                  "h-11 bg-transparent px-0 shadow-none data-[hover=true]:bg-transparent group-data-[focus=true]:bg-transparent",
              }}
              placeholder="Describe an image…"
              startContent={
                isSearching ? (
                  <LoadingAnimation size="tiny" />
                ) : (
                  <MagnifyingGlass className="text-zinc-400" size={22} />
                )
              }
              value={query}
              variant="flat"
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" && results.length) {
                  event.preventDefault();
                  setActiveIndex((index) => (index + 1) % results.length);
                }
                if (event.key === "ArrowUp" && results.length) {
                  event.preventDefault();
                  setActiveIndex(
                    (index) => (index - 1 + results.length) % results.length,
                  );
                }
                if (event.key === "Enter" && selectedResult) {
                  event.preventDefault();
                  openResult(selectedResult);
                }
              }}
              onValueChange={setQuery}
            />
          </div>

          <div className="min-h-56 overflow-y-auto p-2">
            {normalizedQuery.length < 2 ? (
              <PaletteMessage
                icon={<Sparkle size={24} />}
                text="Describe what you remember—objects, setting, colors, or what people were doing."
                title="Search by meaning"
              />
            ) : error ? (
              <PaletteMessage
                icon={<WarningCircle size={24} />}
                text={error}
                title="Search could not run"
              />
            ) : !isSearching && results.length === 0 ? (
              <PaletteMessage
                icon={<ImageSquare size={24} />}
                text="Try a broader visual description, or index more of your Slack library."
                title="No matching images yet"
              />
            ) : (
              <div className="space-y-1">
                {results.map((result, index) => {
                  const providerFileId = result.uploads[0]?.providerFileId;

                  return (
                    <button
                      key={result._id}
                      className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors ${
                        index === activeIndex
                          ? "bg-zinc-100 dark:bg-zinc-800"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                      }`}
                      type="button"
                      onClick={() => openResult(result)}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                        <SearchThumbnail
                          fileName={result.fileName}
                          providerFileId={providerFileId}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {result.fileName}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {[result.uploadedBy?.name, formatDimensions(result)]
                            .filter(Boolean)
                            .join(" · ") || "Slack image"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex h-9 items-center justify-between border-t border-zinc-200 px-4 text-[11px] text-zinc-400 dark:border-zinc-700">
            <span>↑↓ Navigate · Enter Open · Esc Close</span>
            {process.env.NODE_ENV === "development" && backend ? (
              <span>
                {backend === "atlas" ? "Atlas vector" : "Local exact"}
              </span>
            ) : null}
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}

function PaletteMessage({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center px-8 text-center">
      <div className="mb-3 text-zinc-400">{icon}</div>
      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
        {title}
      </p>
      <p className="mt-1 max-w-md text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        {text}
      </p>
    </div>
  );
}

function formatDimensions(result: SearchResult): string | null {
  const { width, height } = result.metadata ?? {};

  return typeof width === "number" && typeof height === "number"
    ? `${width} × ${height}`
    : null;
}

function SearchThumbnail({
  providerFileId,
  fileName,
}: {
  providerFileId?: string;
  fileName: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (!providerFileId || hasError) {
    return (
      <ImageSquare
        className="absolute inset-0 m-auto text-zinc-400"
        size={24}
      />
    );
  }

  return (
    <Image
      fill
      unoptimized
      alt={fileName}
      className="object-contain"
      sizes="56px"
      src={`/api/files/${providerFileId}?variant=thumbnail`}
      onError={() => setHasError(true)}
    />
  );
}
