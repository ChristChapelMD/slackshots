import { WorkspaceDTO } from "@/services/api/db/models/workspace.model";

interface CurrentWorkspaceResponse {
  workspace: WorkspaceDTO | null;
}

export async function fetchCurrentWorkspace(): Promise<WorkspaceDTO | null> {
  const response = await fetch("/api/workspace/current", {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch current workspace");
  }

  const data: CurrentWorkspaceResponse = await response.json();

  return data.workspace ?? null;
}

export async function addWorkspace(): Promise<{
  success: boolean;
  url?: string;
  error?: Error;
}> {
  const response = await fetch("/api/workspace/add", {
    method: "POST",
    credentials: "include",
  });
  const data = await response.json();

  if (!response.ok || !data.url) {
    throw new Error("Failed to start OAuth");
  }

  return { success: true, url: data.url };
}
