"use client";

import { useCallback, useRef } from "react";
import { Button } from "@heroui/button";
import Image from "next/image";
import dynamic from "next/dynamic";

import { useFiles } from "@/hooks/use-files";
import { useUIStore } from "@/stores/ui-store";
import { GridView } from "@/components/dashboard/content/grid/grid-view";
import { cn } from "@/lib/utils";
import { BaseDrawer } from "@/components/drawers/dashboard/base-drawer";
import { useWorkspace } from "@/hooks/use-workspace";
import SlackLogo from "@/public/SLA-appIcon-desktop.png";
import LoadingAnimation from "@/components/ui/loading-animation";

const FileModal = dynamic(
  () =>
    import("@/components/modals/dashboard/file-modal").then(
      (module) => module.FileModal,
    ),
  { ssr: false },
);

export function MainContentContainer() {
  const { files, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useFiles();
  const viewMode = useUIStore((state) => state.viewMode);

  const mainContainerRef = useRef<HTMLDivElement>(null);

  const {
    currentWorkspace,
    addWorkspace,
    isPending: workspaceLoading,
  } = useWorkspace();
  const scrollCallback = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const insetBorderOffset = 8;

  return (
    <div
      ref={mainContainerRef}
      className={cn(
        "relative flex-1 overflow-hidden",
        viewMode === "grid"
          ? `bg-zinc-50 dark:bg-zinc-900 border-${insetBorderOffset} border-zinc-100 dark:border-zinc-800 rounded-3xl`
          : "bg-transparent border-none",
      )}
    >
      {viewMode === "grid" && (
        <div className="absolute inset-0 pointer-events-none z-10 shadow-well-lg dark:shadow-well-dark-lg" />
      )}
      <main
        ref={scrollRef}
        className={cn(
          "relative h-full w-full overflow-y-auto z-0",
          viewMode === "grid" ? "bg-zinc-100 dark:bg-zinc-800 p-4" : "p-6",
        )}
      >
        {!currentWorkspace ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 p-8 rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-md">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Connect Slack
            </h2>
            <p className="text-center text-slate-600 dark:text-slate-400 max-w-md">
              This deployment does not have an active Slack workspace yet.
              Connect your Slack workspace to start using the app.
            </p>
            <Button
              className="flex items-center justify-center gap-2 w-full max-w-xs rounded-lg px-4 py-3 text-slate-900 font-medium border border-zinc-300 bg-white shadow-sm hover:shadow-md transition-shadow"
              isLoading={workspaceLoading}
              onPress={() => addWorkspace()}
            >
              <Image alt="Slack Logo" height={24} src={SlackLogo} width={24} />
              {workspaceLoading
                ? "Authenticating with Slack..."
                : "Continue with Slack"}
            </Button>
          </div>
        ) : (
          <>
            {viewMode === "grid" && (
              <>
                <GridView
                  files={files}
                  hasNextPage={Boolean(hasNextPage)}
                  isFetchingNextPage={isFetchingNextPage}
                  isLoading={isLoading}
                  scrollContainerRef={scrollRef}
                  onLoadMore={scrollCallback}
                />
              </>
            )}
          </>
        )}
        <BaseDrawer containerRef={mainContainerRef} />
        <FileModal containerRef={mainContainerRef} />
      </main>
      {isFetchingNextPage ? (
        <div className="pointer-events-none absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-zinc-200/80 bg-white/95 py-1 pl-1 pr-4 text-sm font-medium shadow-lg backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95">
          <LoadingAnimation size="tiny" />
          <span className="-ml-2 whitespace-nowrap">Loading more images</span>
        </div>
      ) : null}
    </div>
  );
}
