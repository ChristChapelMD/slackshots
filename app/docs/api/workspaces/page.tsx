import { Card } from "@heroui/card";

export default function WorkspacesPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold">Slack Workspace API</h1>
      <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
        SlackShots uses a single active Slack workspace per deployment. These
        endpoints let you inspect the active workspace and connect a workspace
        via OAuth.
      </p>

      <Card className="mt-8 p-6">
        <h2 className="text-2xl font-bold">GET /api/workspace/current</h2>
        <p className="mt-4 text-lg">Fetches the currently active workspace.</p>
      </Card>

      <Card className="mt-8 p-6">
        <h2 className="text-2xl font-bold">POST /api/workspace/add</h2>
        <p className="mt-4 text-lg">
          Starts Slack OAuth to connect or refresh the active workspace.
        </p>
      </Card>
    </div>
  );
}
