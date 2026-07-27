import { Channel, ChannelOption } from "@/types/service-types/channel-service";

export async function fetchChannels(): Promise<ChannelOption[]> {
  const response = await fetch("/api/channels", {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));

    throw new Error(data.message || data.error || "Failed to fetch channels");
  }

  const data: { channels: Channel[] } = await response.json();

  return data.channels.map((channel) => ({
    value: channel.id,
    label: channel.name,
    isMember: channel.isMember,
  }));
}
