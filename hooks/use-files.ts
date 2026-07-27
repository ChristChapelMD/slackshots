"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";

import { client } from "@/services/client";
import { useWorkspace } from "@/hooks/use-workspace";

const STALE_TIME = 1000 * 60 * 5;

export function useFiles() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  const {
    data,
    error,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["files", currentWorkspace?.workspaceId],
    queryFn: ({ pageParam }) => client.files.fetchFiles(pageParam, 48),
    initialPageParam: null as string | null,
    enabled: !!currentWorkspace,
    getNextPageParam: (lastPage) => {
      return lastPage.nextCursor || undefined;
    },
    staleTime: STALE_TIME,
  });

  const files = data?.pages.flatMap((page) => page.files) ?? [];

  const refreshFiles = () => {
    queryClient.invalidateQueries({ queryKey: ["files"] });
  };

  return {
    files,
    error,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refreshFiles,
  };
}
