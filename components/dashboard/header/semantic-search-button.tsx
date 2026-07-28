"use client";

import { useEffect } from "react";
import { Button } from "@heroui/button";
import { Kbd } from "@heroui/kbd";
import { MagnifyingGlass } from "@phosphor-icons/react";

import { useSearchStore } from "@/stores/search-store";

export function SemanticSearchButton() {
  const openSearch = useSearchStore((state) => state.openSearch);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openSearch]);

  return (
    <Button
      className="h-10 w-full justify-between border border-zinc-200/80 bg-white/70 px-3 text-zinc-500 shadow-sm backdrop-blur transition-colors hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-400 dark:hover:bg-zinc-900"
      radius="lg"
      variant="flat"
      onPress={openSearch}
    >
      <span className="flex min-w-0 items-center gap-2">
        <MagnifyingGlass className="shrink-0" size={18} />
        <span className="hidden truncate text-sm sm:block">
          Search your Slack images
        </span>
      </span>
      <Kbd
        className="hidden border-zinc-200 bg-zinc-100 text-[10px] text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 md:inline-flex"
        keys={["command"]}
      >
        K
      </Kbd>
    </Button>
  );
}
