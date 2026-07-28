import { loadEnvConfig } from "@next/env";
import { MongoClient } from "mongodb";

loadEnvConfig(process.cwd());

const INDEX_NAME =
  process.env.MONGO_IMAGE_VECTOR_INDEX_NAME ?? "image_semantic_v1";
const POLL_INTERVAL_MS = 2_000;
const WAIT_TIMEOUT_MS = 10 * 60_000;

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required.");
  }

  const client = new MongoClient(process.env.MONGO_URI);

  try {
    await client.connect();

    const collection = client.db().collection("image_indexes");
    const existing = await collection.listSearchIndexes(INDEX_NAME).toArray();

    if (existing.length === 0) {
      await collection.createSearchIndex({
        name: INDEX_NAME,
        type: "vectorSearch",
        definition: {
          fields: [
            {
              type: "vector",
              path: "embedding",
              numDimensions: 512,
              similarity: "dotProduct",
            },
            { type: "filter", path: "workspaceId" },
            { type: "filter", path: "indexVersion" },
            { type: "filter", path: "status" },
          ],
        },
      });
      console.log(`Created MongoDB Vector Search index "${INDEX_NAME}".`);
    } else {
      console.log(
        `MongoDB Vector Search index "${INDEX_NAME}" already exists.`,
      );
    }

    const deadline = Date.now() + WAIT_TIMEOUT_MS;

    while (Date.now() < deadline) {
      const indexes = await collection.listSearchIndexes(INDEX_NAME).toArray();
      const index = indexes[0] as
        | { queryable?: boolean; status?: string }
        | undefined;

      if (index?.queryable === true || index?.status === "READY") {
        console.log(`MongoDB Vector Search index "${INDEX_NAME}" is ready.`);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    throw new Error(
      `Timed out waiting for MongoDB Vector Search index "${INDEX_NAME}" to become ready.`,
    );
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Vector index creation failed.",
  );
  process.exitCode = 1;
});
