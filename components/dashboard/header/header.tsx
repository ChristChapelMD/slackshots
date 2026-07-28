"use client";

import Link from "next/link";
import Image from "next/image";

import { SelectModeButton } from "@/components/dashboard/header/select-mode/select-mode-button";
import { ViewSelectedButton } from "@/components/dashboard/header/select-mode/view-selected-button";
import { SelectActionButtons } from "@/components/dashboard/header/select-mode/select-action-buttons";
import { GridDensityToggle } from "@/components/dashboard/header/grid-density/grid-density-toggle";
import { SettingsButton } from "@/components/dashboard/header/settings-button";
import { SemanticSearchButton } from "@/components/dashboard/header/semantic-search-button";
import { useMediaQuery } from "@/hooks/use-media-query";

export function Header() {
  const isMobile = useMediaQuery("(max-width: 768px)");

  return (
    <header
      className="h-16 w-full rounded-t-xl border-zinc-700/25 px-4"
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <div className="flex shrink-0 flex-row items-center">
        <Link className="flex items-center" href="/">
          <Image
            alt="SlackShots Logo"
            className=""
            height={50}
            src="/SSLOGO_NOBG.png"
            width={50}
          />
          <h1 className="text-4xl tracking-tighter font-bold text-foreground hidden md:block">
            SlackShots
          </h1>
        </Link>
        {!isMobile && (
          <div className="ml-4">
            <GridDensityToggle />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-row justify-center px-4">
        <div className="w-full max-w-xl">
          <SemanticSearchButton />
        </div>
      </div>

      <div className="ml-auto flex shrink-0 flex-row items-center gap-2">
        {!isMobile && (
          <>
            <ViewSelectedButton />
            <SelectActionButtons />
            <SelectModeButton />
          </>
        )}
        {isMobile && (
          <div className="ml-4">
            <GridDensityToggle />
          </div>
        )}
        <SettingsButton />
      </div>
    </header>
  );
}
