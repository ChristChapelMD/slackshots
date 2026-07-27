"use client";

import { useState, lazy, Suspense } from "react";
import { Tabs, Tab } from "@heroui/tabs";

import { SelectModeActions } from "../header/select-mode/select-mode-actions";

import { FileSelector } from "./file-selector/file-selector";
import { UploadButton } from "./upload-button/upload-button";
import { UploadQueueStatus } from "./upload-button/upload-queue-status";

import { useMediaQuery } from "@/hooks/use-media-query";

const ChannelSelector = lazy(() =>
  import("./channel-selector/channel-selector").then((m) => ({
    default: m.ChannelSelector,
  })),
);
const BatchSizeSlider = lazy(() =>
  import("./batch-size-slider/batch-size-slider").then((m) => ({
    default: m.BatchSizeSlider,
  })),
);
const MessageComment = lazy(() =>
  import("./message-comment/message-comment").then((m) => ({
    default: m.MessageComment,
  })),
);

const ComponentLoader = () => (
  <div className="w-full h-32 animate-pulse bg-zinc-200 dark:bg-zinc-700 rounded-xl" />
);

export function Toolbar() {
  const isMobile = useMediaQuery("(max-width: 768px)", false);
  const [activeTab, setActiveTab] = useState("files");

  // Mobile layout (tabbed style)
  if (isMobile) {
    return (
      <aside className="flex flex-col h-full overflow-hidden">
        <div className="w-full flex justify-end px-4 pb-2">
          <SelectModeActions />
        </div>
        <Tabs
          aria-label="Upload Settings"
          className="flex-1 overflow-hidden flex flex-col"
          classNames={{
            base: "flex-1 flex flex-col",
            tabList: "bg-zinc-100 dark:bg-zinc-800 px-2 overflow-x-auto",
            tabContent: "flex-1 overflow-auto",
          }}
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(key.toString())}
        >
          <Tab key="files" title="Files">
            <div className="p-4">
              <FileSelector />
            </div>
          </Tab>
          <Tab key="channel" title="Channel">
            <div className="p-4">
              <Suspense fallback={<ComponentLoader />}>
                <ChannelSelector />
              </Suspense>
            </div>
          </Tab>
          <Tab key="batch" title="Batch Size">
            <div className="p-4">
              <Suspense fallback={<ComponentLoader />}>
                <BatchSizeSlider />
              </Suspense>
            </div>
          </Tab>
          <Tab key="comment" title="Comment">
            <div className="p-4">
              <Suspense fallback={<ComponentLoader />}>
                <MessageComment />
              </Suspense>
            </div>
          </Tab>
        </Tabs>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-700">
          <div className="mb-3">
            <UploadQueueStatus />
          </div>
          <UploadButton />
        </div>
      </aside>
    );
  }

  // Desktop layout
  return (
    <aside className="flex flex-col h-full items-center justify-between px-4 rounded-b-xl md:rounded-br-none">
      <div className="flex flex-col w-full max-w-md space-y-4 overflow-y-auto flex-1 py-2">
        <div className="w-full mx-auto">
          <FileSelector />
        </div>
        <Suspense fallback={<ComponentLoader />}>
          <div className="w-full mx-auto">
            <ChannelSelector />
          </div>
        </Suspense>
        <Suspense fallback={<ComponentLoader />}>
          <div className="w-full mx-auto">
            <BatchSizeSlider />
          </div>
        </Suspense>
        <Suspense fallback={<ComponentLoader />}>
          <div className="w-full mx-auto">
            <MessageComment />
          </div>
        </Suspense>
      </div>

      <div className="w-full max-w-md mx-auto my-2">
        <div className="mb-3">
          <UploadQueueStatus />
        </div>
        <UploadButton />
      </div>
    </aside>
  );
}
