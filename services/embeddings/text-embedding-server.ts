import type { TextEmbedder } from "./image-embedder";

import http, {
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";

const MAX_BODY_BYTES = 16 * 1024;
const MAX_TEXTS_PER_REQUEST = 16;
const MAX_TEXT_LENGTH = 500;

interface TextEmbeddingServerOptions {
  host?: string;
  port?: number;
  token?: string;
}

function sendJson(
  response: ServerResponse,
  status: number,
  payload: Record<string, unknown>,
) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);

    size += buffer.length;
    if (size > MAX_BODY_BYTES) {
      throw new Error("REQUEST_TOO_LARGE");
    }
    chunks.push(buffer);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export async function startTextEmbeddingServer(
  embedder: TextEmbedder,
  options: TextEmbeddingServerOptions = {},
): Promise<Server> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 3001;

  if (
    host !== "127.0.0.1" &&
    host !== "localhost" &&
    host !== "::1" &&
    !options.token
  ) {
    throw new Error(
      "EMBEDDING_SERVICE_TOKEN is required when binding beyond localhost.",
    );
  }

  const server = http.createServer(async (request, response) => {
    if (request.method === "GET" && request.url === "/health") {
      sendJson(response, 200, { status: "ok" });

      return;
    }

    if (request.method !== "POST" || request.url !== "/v1/embeddings/text") {
      sendJson(response, 404, { error: "Not found" });

      return;
    }

    if (
      options.token &&
      request.headers.authorization !== `Bearer ${options.token}`
    ) {
      sendJson(response, 401, { error: "Unauthorized" });

      return;
    }

    try {
      const body = (await readJsonBody(request)) as { texts?: unknown };
      const texts = body.texts;

      if (
        !Array.isArray(texts) ||
        texts.length < 1 ||
        texts.length > MAX_TEXTS_PER_REQUEST ||
        !texts.every(
          (text) =>
            typeof text === "string" &&
            text.trim().length > 0 &&
            text.length <= MAX_TEXT_LENGTH,
        )
      ) {
        sendJson(response, 400, { error: "Invalid texts" });

        return;
      }

      const embeddings = await embedder.embedTexts(texts);

      sendJson(response, 200, {
        descriptor: embedder.descriptor,
        embeddings,
      });
    } catch (error) {
      sendJson(
        response,
        error instanceof Error && error.message === "REQUEST_TOO_LARGE"
          ? 413
          : 500,
        { error: "Embedding failed" },
      );
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  return server;
}
