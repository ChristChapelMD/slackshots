import type { EmbeddingModelDescriptor, TextEmbedder } from "./image-embedder";

interface EmbeddingServiceResponse {
  descriptor: EmbeddingModelDescriptor;
  embeddings: number[][];
}

export class HttpTextEmbedder implements TextEmbedder {
  readonly descriptor: EmbeddingModelDescriptor = {
    modelId: "remote",
    revision: "unknown",
    dtype: "unknown",
    dimensions: null,
  };

  constructor(
    private readonly serviceUrl: string = process.env.EMBEDDING_SERVICE_URL ??
      "http://127.0.0.1:3001",
    private readonly serviceToken: string | undefined = process.env
      .EMBEDDING_SERVICE_TOKEN,
  ) {}

  async embedTexts(texts: string[]): Promise<number[][]> {
    const response = await fetch(
      `${this.serviceUrl.replace(/\/$/, "")}/v1/embeddings/text`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.serviceToken
            ? { Authorization: `Bearer ${this.serviceToken}` }
            : {}),
        },
        body: JSON.stringify({ texts }),
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
      },
    ).catch(() => {
      throw new Error("The local embedding service is unavailable.");
    });

    if (!response.ok) {
      throw new Error(
        response.status === 503
          ? "The embedding model is still starting."
          : "The embedding service rejected the search query.",
      );
    }

    const payload = (await response.json()) as EmbeddingServiceResponse;

    Object.assign(this.descriptor, payload.descriptor);

    return payload.embeddings;
  }
}
