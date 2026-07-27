import { Card } from "@heroui/card";
import { Snippet } from "@heroui/snippet";

export default function ConfigurationPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold">Configuration</h1>
      <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
        To run SlackShots, you need to configure your environment variables.
        Create a `.env.local` file in the root of the project and add the
        following variables:
      </p>

      <Card className="mt-8 p-6">
        <h2 className="text-2xl font-bold">Environment Variables</h2>
        <Snippet className="mt-4">
          {`MONGO_URI=mongodb://localhost:27017/slackshots
MONGO_DB_NAME=slackshots
BETTER_AUTH_SECRET=replace-with-a-long-random-secret
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_OAUTH2_V2_REDIRECT_URI=http://localhost:3000/api/slack/oauth2_v2/callback
`}
        </Snippet>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Add both `/api/auth/callback/slack` and
          `/api/slack/oauth2_v2/callback` as redirect URLs in your Slack app.
          The first signs workspace members in; the second installs the bot.
        </p>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Run `npm run dev` for localhost. Local development uses a server-side
          identity bypass, so Slack sign-in is not required. The bypass cannot
          run in production. For real OAuth testing, use tunnel mode and open
          the public HTTPS URL in the browser.
        </p>
      </Card>
    </div>
  );
}
