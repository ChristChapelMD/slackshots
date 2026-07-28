"use client";

import { Button, ButtonGroup } from "@heroui/button";
import { Tooltip } from "@heroui/tooltip";

import { GridDensities } from "./grid-density-icons";

import { TextureContainer } from "@/components/ui/texture-container";
import { useDrawerStore } from "@/stores/drawer-store";
import { useGridDensity } from "@/hooks/use-grid-density";
import { useUploadProcessStore } from "@/stores/upload-process-store";

export function GridDensityToggle() {
  const { gridDensity, setGridDensity } = useGridDensity();
  const isOpen = useDrawerStore((state) => state.isOpen);
  const isAnimating = useDrawerStore((state) => state.isAnimating);
  const isUploading = useUploadProcessStore((state) => state.isUploading);

  const isDrawerOpen = isOpen || isAnimating;
  const isDisabled = isDrawerOpen || isUploading;

  return (
    <>
      <div className="lg:block">
        <TextureContainer>
          <ButtonGroup
            className="bg-zinc-200 dark:bg-zinc-700 rounded-xl"
            variant="shadow"
          >
            {GridDensities.map((density) => (
              <Tooltip key={density.key} content={density.tooltipText}>
                <Button
                  isIconOnly
                  className={`
                    focus-visible-inset transition-colors
                    ${
                      gridDensity === density.key
                        ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border-zinc-400 dark:border-zinc-500"
                        : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-500"
                    }
                  `}
                  isDisabled={isDisabled}
                  variant="shadow"
                  onPress={() =>
                    setGridDensity(density.key as "lo" | "md" | "hi")
                  }
                >
                  {density.icon()}
                </Button>
              </Tooltip>
            ))}
          </ButtonGroup>
        </TextureContainer>
      </div>
    </>
  );
}
