import { Card } from "@heroui/card";
import { Snippet } from "@heroui/snippet";

export default function InstallationPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold">Installation</h1>
      <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
        To get started with SlackShots, you need to clone the repository and
        install the dependencies.
      </p>

      <Card className="mt-8 p-6">
        <h2 className="text-2xl font-bold">Clone the repository</h2>
        <p className="mt-4 text-lg">
          You can clone the repository using the following command:
        </p>
        <Snippet className="mt-4">
          git clone https://github.com/your-username/slackshots-frontend.git
        </Snippet>
      </Card>

      <Card className="mt-8 p-6">
        <h2 className="text-2xl font-bold">Install dependencies</h2>
        <p className="mt-4 text-lg">
          Once you have cloned the repository, you can install the dependencies
          using npm:
        </p>
        <Snippet className="mt-4">npm install</Snippet>
      </Card>
    </div>
  );
}
