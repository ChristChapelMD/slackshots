import {
  FileItem,
  FetchFilesResponse,
} from "@/types/service-types/file-service";

export async function fetchFiles(
  cursor: string | null,
  limit: number,
  fileTypes?: string[],
): Promise<FetchFilesResponse> {
  const searchParams = new URLSearchParams({ limit: String(limit) });

  if (cursor) {
    searchParams.set("cursor", cursor);
  }

  if (fileTypes && fileTypes.length > 0) {
    searchParams.set("fileTypes", fileTypes.join(","));
  }

  const response = await fetch(`/api/files?${searchParams.toString()}`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));

    throw new Error(data.message || data.error || "Failed to fetch files");
  }

  const data = await response.json();

  return {
    files: data.files || [],
    hasMore: Boolean(data.nextCursor),
    nextCursor: data.nextCursor ?? null,
    limit: data.limit,
  };
}

export async function deleteFiles(
  files: { fileId: string; deleteFlag: "app" | "both" }[],
): Promise<boolean> {
  if (!files || files.length === 0) {
    throw new Error("No files selected to delete.");
  }

  const response = await fetch("/api/files", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ files }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));

    throw new Error(data.message || data.error || "Failed to delete files");
  }

  return true;
}

export async function downloadSingleFile(file: FileItem): Promise<void> {
  const providerFileId = file.uploads?.[0]?.providerFileId;

  if (!providerFileId) throw new Error("Invalid file or missing provider ID");

  const response = await fetch(`/api/files/${providerFileId}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = objectUrl;
  a.download = file.fileName || `file-${file._id}`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  }, 100);
}

export async function downloadMultipleFiles(files: FileItem[]): Promise<void> {
  if (!files || files.length === 0)
    throw new Error("No files selected to download");

  // Fallback: trigger individual downloads for each file
  for (const file of files) {
    await downloadSingleFile(file);
  }
}
