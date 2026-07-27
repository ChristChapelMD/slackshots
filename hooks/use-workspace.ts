import { client } from "@/services/client";
import { useToastQuery } from "@/hooks/use-toast-query";
import { useToastMutation } from "@/hooks/use-toast-mutation";

export function useWorkspace() {
  const { data: currentWorkspace, ...rest } = useToastQuery({
    queryKey: ["workspace"],
    queryFn: () => client.workspace.fetchCurrentWorkspace(),
    toast: {
      onError: {
        title: "Error loading Slack workspace",
        description:
          "Unable to retrieve the active Slack workspace. Please try again later.",
        status: "error",
      },
    },
  });

  const { mutate: addWorkspace, ...mutationRest } = useToastMutation(
    {
      mutationFn: client.workspace.addWorkspace,
      onSuccess: (data) => {
        if (data.url) {
          window.location.href = data.url;
        }
      },
      toast: {
        onError: {
          title: "Error connecting Slack workspace",
          description:
            "Unable to connect the Slack workspace. Please try again.",
          status: "error",
        },
      },
    },
    ["addWorkspace"],
  );

  return { currentWorkspace, addWorkspace, ...rest, ...mutationRest };
}
