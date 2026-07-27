import { useMutation, useQueryClient } from "@tanstack/react-query";

interface AddBotResponse {
  success: boolean;
}

export function useAddBot() {
  const queryClient = useQueryClient();

  const addBotToChannel = async (
    channelId: string,
  ): Promise<AddBotResponse> => {
    const res = await fetch(`/api/channels/${channelId}/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));

      throw new Error(errorData.message || "Failed to add bot to channel");
    }

    return res.json();
  };

  return useMutation({
    mutationFn: addBotToChannel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
    onError: (error: Error) => {
      // eslint-disable-next-line no-console
      console.error(`Error adding bot to channel: ${error.message}`);
    },
  });
}
