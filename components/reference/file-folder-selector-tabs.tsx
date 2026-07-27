"use client";

import type { ReactNode } from "react";

import { useState } from "react";
import { File, FolderOpen } from "@phosphor-icons/react";
import { Tab, Tabs } from "@heroui/tabs";

/**
 * Reference-only version of the original files/folder tab treatment.
 *
 * Keep this component out of production imports. Pass the actual file and
 * folder picker cards as `filesContent` and `folderContent` when reusing it.
 */
export function FileFolderSelectorTabs({
  filesContent,
  folderContent,
  disabled = false,
}: {
  filesContent: ReactNode;
  folderContent: ReactNode;
  disabled?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"files" | "folder">("files");

  return (
    <Tabs
      aria-label="File selection options"
      className="w-full"
      classNames={{
        base: "flex flex-col items-center",
        tabList:
          "w-full rounded-t-lg border-b border-zinc-200 bg-gray-50 dark:border-zinc-700 dark:bg-[#181818]",
        tab: "flex justify-center data-[selected=true]:bg-white dark:data-[selected=true]:bg-[#282828]",
        tabContent: "flex w-full flex-col items-center rounded-b-lg p-0",
        panel: "flex w-full flex-col items-center",
      }}
      isDisabled={disabled}
      selectedKey={activeTab}
      onSelectionChange={(key) =>
        setActiveTab(key.toString() as "files" | "folder")
      }
    >
      <Tab
        key="files"
        title={
          <span className="flex items-center justify-center gap-2">
            <File size={20} />
            Select Files
          </span>
        }
      >
        {filesContent}
      </Tab>
      <Tab
        key="folder"
        title={
          <span className="flex items-center justify-center gap-2">
            <FolderOpen size={20} />
            Select Folder
          </span>
        }
      >
        {folderContent}
      </Tab>
    </Tabs>
  );
}
