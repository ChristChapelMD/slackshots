"use client";

import { useRef, memo } from "react";
import { Card, CardBody, CardFooter } from "@heroui/card";
import { Radio, RadioGroup } from "@heroui/radio";

import { QuickActionMenu } from "./quick-action-menu";

import { GridItemProps } from "@/types/grid-types";
import { FileRenderer } from "@/components/file-types/file-renderer";
import { useGridItemInteraction } from "@/hooks/use-grid-interaction";

export default memo(function GridItem({ item, items }: GridItemProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    isHovered,
    isSelected,
    isDisabled,
    isSelectMode,
    handleMouseEnter,
    handleMouseLeave,
    handleItemInteraction,
    handleKeyDown,
  } = useGridItemInteraction(item, items);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full rounded-2xl aspect-square"
      data-file-id={item._id}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Card
        isPressable
        className={`grid-item-visible-focus w-full h-full overflow-hidden ${
          isSelected && isSelectMode ? "ring-2 ring-secondary-500" : ""
        }`}
        isDisabled={isDisabled}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPress={handleItemInteraction}
      >
        <CardBody className="p-0 h-full">
          <FileRenderer item={item} />
        </CardBody>
        {isHovered && !isSelectMode && (
          <CardFooter className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 flex justify-center">
            <p className="text-white text-sm truncate w-full text-center">
              {item.fileName}
            </p>
          </CardFooter>
        )}
      </Card>
      {isSelectMode && !isDisabled && (
        <div className="absolute top-2 right-2 z-10">
          <RadioGroup
            className="pointer-events-none"
            value={isSelected ? item._id : ""}
          >
            <Radio
              classNames={{
                wrapper: "bg-white dark:bg-black bg-opacity-50 rounded-full",
              }}
              color="secondary"
              size="lg"
              value={item._id}
            />
          </RadioGroup>
        </div>
      )}

      {isHovered && !isSelectMode && !isDisabled && (
        <QuickActionMenu
          isHovered={isHovered}
          isSelectMode={isSelectMode}
          item={item}
        />
      )}
    </div>
  );
});
