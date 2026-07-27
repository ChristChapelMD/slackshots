import { createSlackClient } from "./client";

export async function getChannels(accessToken: string) {
  const client = createSlackClient(accessToken);

  try {
    const channels = [];
    let cursor: string | undefined;

    do {
      const result = await client.conversations.list({
        cursor,
        exclude_archived: true,
        limit: 200,
        types: "public_channel,private_channel",
      });

      channels.push(
        ...(result.channels?.map((channel) => ({
          id: channel.id,
          name: channel.name,
          isMember: channel.is_member,
        })) ?? []),
      );
      cursor = result.response_metadata?.next_cursor || undefined;
    } while (cursor);

    return channels;
  } catch (error) {
    console.error(`Error fetching Slack channels: ${error}`);
    throw new Error("Failed to fetch Slack channels.");
  }
}

export async function joinChannel(accessToken: string, channelId: string) {
  const client = createSlackClient(accessToken);

  try {
    await client.conversations.join({ channel: channelId });
  } catch (error) {
    console.error(`Error joining channel ${channelId}: ${error}`);
    throw new Error(`Failed to join channel ${channelId}.`);
  }
}

export async function findWorkspaceMemberByEmail(
  accessToken: string,
  email: string,
) {
  const client = createSlackClient(accessToken);
  const result = await client.users.lookupByEmail({ email });
  const user = result.user;

  if (!user?.id || user.deleted || user.is_bot) {
    return null;
  }

  return {
    id: user.id,
    teamId: user.team_id,
    name: user.real_name || user.name || email,
    image: user.profile?.image_192 || user.profile?.image_72,
  };
}
