import { useWorkspace } from "@/hooks/use-workspace";
import { useToastQuery } from "@/hooks/use-toast-query";
import { client } from "@/services/client";

export function useChannels() {
  const { currentWorkspace } = useWorkspace();

  return useToastQuery({
    queryKey: ["channels", currentWorkspace?.workspaceId],
    queryFn: () => client.channels.fetchChannels(),
    enabled: !!currentWorkspace,
    toast: {
      onError: {
        title: "Error fetching channels",
        description:
          "Unable to retrieve available channels. Please try again later.",
        status: "error",
      },
    },
  });
}
