"use client";

import { useState } from "react";
import Image from "next/image";

import { FileItem } from "@/types/service-types/file-service";
import { formatFileSize } from "@/lib/utils/format-utils";

interface ImageDetailDisplayProps {
  item: FileItem;
}

export default function ImageDetailDisplay({ item }: ImageDetailDisplayProps) {
  const [hasError, setHasError] = useState(false);

  const providerFileId = item.uploads?.[0]?.providerFileId;
  const imageUrl = providerFileId ? `/api/files/${providerFileId}` : null;

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* Image preview */}
      <div className="relative w-full md:w-2/3 h-80 md:h-full bg-black flex items-center justify-center">
        {imageUrl && (
          <Image
            fill
            unoptimized
            alt={item.fileName || "Image"}
            className="object-contain"
            src={imageUrl}
            onError={() => setHasError(true)}
          />
        )}
        {hasError && (
          <div className="text-white text-center p-4">
            Unable to display this image
          </div>
        )}
      </div>

      {/* Details panel */}
      <div className="w-full md:w-1/3 p-6 overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">{item.fileName}</h2>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="font-medium">File Size</div>
            <div className="col-span-2">{formatFileSize(item.fileSize)}</div>

            <div className="font-medium">Type</div>
            <div className="col-span-2">{item.fileType}</div>

            <div className="font-medium">Dimensions</div>
            <div className="col-span-2">
              {item.fileSize}×{item.fileSize}px
            </div>

            <div className="font-medium">Uploaded</div>
            <div className="col-span-2">{"formatDate(item.uploadDate)"}</div>
          </div>

          {/* Add more file details here */}
        </div>
      </div>
    </div>
  );
}
