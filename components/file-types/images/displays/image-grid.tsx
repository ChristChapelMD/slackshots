"use client";

import { useState } from "react";
import Image from "next/image";
import { Skeleton } from "@heroui/skeleton";

import { FileItem } from "@/types/service-types/file-service";

interface ImageGridDisplayProps {
  item: FileItem;
}

export default function ImageGridDisplay({ item }: ImageGridDisplayProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const providerFileId = item.uploads?.[0]?.providerFileId;
  const imageUrl = providerFileId
    ? `/api/files/${providerFileId}?variant=thumbnail`
    : null;

  if (hasError || !imageUrl) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-zinc-200 dark:bg-zinc-700">
        <Skeleton className="h-full w-full" isLoaded={false}>
          <div className="h-full w-full" />
        </Skeleton>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full aspect-square">
      {imageUrl && (
        <Image
          fill
          unoptimized
          alt={item.fileName || "Image"}
          className={`object-cover transition-opacity duration-300 ${
            !isLoaded ? "opacity-0" : "opacity-100"
          }`}
          loading="lazy"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
          src={imageUrl}
          onError={() => setHasError(true)}
          onLoad={() => {
            setIsLoaded(true);
            setHasError(false);
          }}
        />
      )}
    </div>
  );
}
