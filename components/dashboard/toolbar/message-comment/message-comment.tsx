"use client";

import { ChatCircleDots } from "@phosphor-icons/react";
import { Textarea } from "@heroui/input";
import { memo, useMemo, useCallback } from "react";

import { TextureContainer } from "@/components/ui/texture-container";
import { useDrawerStore } from "@/stores/drawer-store";
import { useUploadFormStore } from "@/stores/upload-form-store";

export const MessageComment = memo(function MessageComment() {
  const uploadFormState = useUploadFormStore((state) => state.formState);
  const updateUploadForm = useUploadFormStore((state) => state.updateForm);
  const isAnimating = useDrawerStore((state) => state.isAnimating);
  const isOpen = useDrawerStore((state) => state.isOpen);

  // Memoize derived state
  const isDrawerOpen = useMemo(
    () => isOpen || isAnimating,
    [isOpen, isAnimating],
  );
  const isDisabled = useMemo(() => isDrawerOpen, [isDrawerOpen]);

  // Memoize the onChange handler
  const handleCommentChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateUploadForm({ comment: e.target.value });
    },
    [updateUploadForm],
  );

  // Memoize classNames to prevent object recreation
  const textareaClassNames = useMemo(
    () => ({
      base: "w-full rounded-xl",
      inputWrapper:
        "rounded-xl bg-white dark:bg-zinc-900 " +
        "data-[hover=true]:bg-white data-[hover=true]:dark:bg-zinc-900 " +
        "data-[focus=true]:bg-white data-[focus=true]:dark:bg-zinc-900 " +
        "border-none",
      input:
        "bg-transparent text-zinc-800 dark:text-zinc-200 caret-zinc-900 dark:caret-white " +
        "placeholder:text-zinc-500 dark:placeholder:text-zinc-400",
      label: "text-zinc-500 dark:text-zinc-400 font-medium mb-1",
    }),
    [],
  );

  // Memoize the label element to prevent recreation
  const textareaLabel = useMemo(
    () => (
      <span className="flex text-black dark:text-white gap-2 items-center py-2">
        <ChatCircleDots aria-hidden="true" size={24} />
        <span className="text-lg font-medium">Message Comment</span>
      </span>
    ),
    [],
  );

  return (
    <TextureContainer className="w-full">
      <Textarea
        classNames={textareaClassNames}
        isDisabled={isDisabled}
        label={textareaLabel}
        maxRows={6}
        placeholder="Enter comment here (optional)..."
        rows={4}
        value={uploadFormState.comment}
        variant="flat"
        onChange={handleCommentChange}
      />
    </TextureContainer>
  );
});
