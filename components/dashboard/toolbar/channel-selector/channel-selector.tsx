"use client";

import { useMemo } from "react";
import { Select, SelectItem } from "@heroui/select";
import { Button } from "@heroui/button";
import { Tooltip } from "@heroui/tooltip";
import { Plus } from "@phosphor-icons/react";

import { useDrawerStore } from "@/stores/drawer-store";
import { useChannels } from "@/hooks/use-channels";
import { useAddBot } from "@/hooks/use-add-bot";
import { TextureContainer } from "@/components/ui/texture-container";
import { useUploadFormStore } from "@/stores/upload-form-store";

export function ChannelSelector() {
  const { data: channelOptions = [], isLoading } = useChannels();
  const {
    mutate: addBotToChannel,
    isPending: isAddingBot,
    variables: joiningChannelId,
  } = useAddBot();

  const uploadFormState = useUploadFormStore((state) => state.formState);
  const updateUploadForm = useUploadFormStore((state) => state.updateForm);
  const isAnimating = useDrawerStore((state) => state.isAnimating);
  const isOpen = useDrawerStore((state) => state.isOpen);

  const isDrawerOpen = isOpen || isAnimating;
  const isDisabled = isDrawerOpen;
  const disabledChannelKeys = useMemo(
    () =>
      new Set(
        channelOptions
          .filter((channel) => !channel.isMember)
          .map((channel) => channel.value),
      ),
    [channelOptions],
  );

  return (
    <TextureContainer className="w-full">
      <Select
        className="w-full"
        classNames={{
          trigger:
            "focus-visible-inset bg-white dark:bg-zinc-900 rounded-xl px-4 py-8",
          listbox:
            "bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl shadow-md",
          base: "w-full",
          label: "text-zinc-500 dark:text-zinc-300 font-medium mb-1",
          innerWrapper: "bg-transparent h-full flex items-center",
          value: "flex items-center",
          selectorIcon: "h-5 w-5",
        }}
        disabledKeys={disabledChannelKeys}
        isDisabled={isDisabled}
        isLoading={isLoading}
        items={channelOptions}
        label="Select a channel"
        listboxProps={{
          itemClasses: {
            base: "text-zinc-800 dark:text-zinc-200 data-[hover=true]:bg-zinc-100 data-[hover=true]:dark:bg-zinc-800 data-[disabled=true]:!pointer-events-auto data-[disabled=true]:opacity-60 px-4 h-[48px] flex items-center",
            selectedIcon: "text-green-500 dark:text-green-400",
          },
        }}
        placeholder="Select a channel"
        renderValue={(items) => {
          return items.map((item) => (
            <div key={item.key} className="font-medium">
              {item.data?.label}
            </div>
          ));
        }}
        selectedKeys={uploadFormState.channel ? [uploadFormState.channel] : []}
        onSelectionChange={(keys) => {
          const selected = Array.from(keys)[0] as string;
          const channel = channelOptions.find(
            (option) => option.value === selected,
          );

          if (channel?.isMember) {
            updateUploadForm({ channel: selected });
          }
        }}
      >
        {(channel) => (
          <SelectItem
            key={channel.value}
            endContent={
              !channel.isMember && (
                <Tooltip content="Add SlackShots to this channel">
                  <Button
                    isIconOnly
                    aria-label={`Add SlackShots to ${channel.label}`}
                    className="h-6 min-w-6 w-6 p-0"
                    isLoading={
                      isAddingBot && joiningChannelId === channel.value
                    }
                    size="sm"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onPress={() => {
                      addBotToChannel(channel.value);
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </Tooltip>
              )
            }
            textValue={channel.label}
          >
            {channel.label}
          </SelectItem>
        )}
      </Select>
    </TextureContainer>
  );
}
