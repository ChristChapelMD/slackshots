import path from "node:path";

import {
  AutoProcessor,
  AutoTokenizer,
  CLIPTextModelWithProjection,
  CLIPVisionModelWithProjection,
  RawImage,
  type DataType,
  type Tensor,
} from "@huggingface/transformers";

import {
  DEFAULT_IMAGE_EMBEDDING_DTYPE,
  DEFAULT_IMAGE_EMBEDDING_MODEL,
  DEFAULT_IMAGE_EMBEDDING_REVISION,
  type EmbeddingModelDescriptor,
  type ImageEmbedder,
} from "./image-embedder";

interface TransformersClipEmbedderOptions {
  modelId?: string;
  revision?: string;
  dtype?: DataType;
  cacheDir?: string;
}

interface EmbeddingOutput {
  image_embeds?: Tensor;
  text_embeds?: Tensor;
}

export class TransformersClipEmbedder implements ImageEmbedder {
  readonly descriptor: EmbeddingModelDescriptor;

  private readonly cacheDir: string;
  private readonly dtype: DataType;
  private processorPromise?: ReturnType<typeof AutoProcessor.from_pretrained>;
  private tokenizerPromise?: ReturnType<typeof AutoTokenizer.from_pretrained>;
  private visionModelPromise?: ReturnType<
    typeof CLIPVisionModelWithProjection.from_pretrained
  >;
  private textModelPromise?: ReturnType<
    typeof CLIPTextModelWithProjection.from_pretrained
  >;

  constructor(options: TransformersClipEmbedderOptions = {}) {
    this.dtype = options.dtype ?? DEFAULT_IMAGE_EMBEDDING_DTYPE;
    this.descriptor = {
      modelId: options.modelId ?? DEFAULT_IMAGE_EMBEDDING_MODEL,
      revision: options.revision ?? DEFAULT_IMAGE_EMBEDDING_REVISION,
      dtype: this.dtype,
      dimensions: null,
    };
    this.cacheDir = path.resolve(
      options.cacheDir ??
        process.env.TRANSFORMERS_CACHE_DIR ??
        ".cache/transformers",
    );
  }

  async embedImage(imageBlob: Blob): Promise<number[]> {
    const [processor, visionModel] = await Promise.all([
      this.getProcessor(),
      this.getVisionModel(),
    ]);
    const image = await RawImage.fromBlob(imageBlob);
    const inputs = await processor(image);
    const output = (await visionModel(inputs)) as EmbeddingOutput;

    if (!output.image_embeds) {
      throw new Error("The vision model did not return an image embedding.");
    }

    return this.readAndNormalize(output.image_embeds);
  }

  async embedTexts(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const [tokenizer, textModel] = await Promise.all([
      this.getTokenizer(),
      this.getTextModel(),
    ]);
    const inputs = tokenizer(texts, {
      padding: "max_length",
      truncation: true,
    });
    const output = (await textModel(inputs)) as EmbeddingOutput;

    if (!output.text_embeds) {
      throw new Error("The text model did not return text embeddings.");
    }

    const dimensions = this.getDimensions(output.text_embeds);
    const values = Array.from(output.text_embeds.data, Number);
    const vectors: number[][] = [];

    for (let offset = 0; offset < values.length; offset += dimensions) {
      vectors.push(this.normalize(values.slice(offset, offset + dimensions)));
    }

    this.recordDimensions(dimensions);

    return vectors;
  }

  async dispose(): Promise<void> {
    const models = await Promise.all([
      this.visionModelPromise,
      this.textModelPromise,
    ]);

    await Promise.all(
      models
        .filter((model) => model !== undefined)
        .map((model) => model.dispose()),
    );
  }

  private getProcessor() {
    this.processorPromise ??= AutoProcessor.from_pretrained(
      this.descriptor.modelId,
      {
        revision: this.descriptor.revision,
        cache_dir: this.cacheDir,
      },
    );

    return this.processorPromise;
  }

  private getTokenizer() {
    this.tokenizerPromise ??= AutoTokenizer.from_pretrained(
      this.descriptor.modelId,
      {
        revision: this.descriptor.revision,
        cache_dir: this.cacheDir,
      },
    );

    return this.tokenizerPromise;
  }

  private getVisionModel() {
    this.visionModelPromise ??= CLIPVisionModelWithProjection.from_pretrained(
      this.descriptor.modelId,
      {
        revision: this.descriptor.revision,
        cache_dir: this.cacheDir,
        dtype: this.dtype,
      },
    );

    return this.visionModelPromise;
  }

  private getTextModel() {
    this.textModelPromise ??= CLIPTextModelWithProjection.from_pretrained(
      this.descriptor.modelId,
      {
        revision: this.descriptor.revision,
        cache_dir: this.cacheDir,
        dtype: this.dtype,
      },
    );

    return this.textModelPromise;
  }

  private readAndNormalize(tensor: Tensor): number[] {
    const dimensions = this.getDimensions(tensor);
    const vector = this.normalize(Array.from(tensor.data, Number));

    if (vector.length !== dimensions) {
      throw new Error(
        `Expected one ${dimensions}-dimension embedding, received ${vector.length} values.`,
      );
    }

    this.recordDimensions(dimensions);

    return vector;
  }

  private getDimensions(tensor: Tensor): number {
    const dimensions = tensor.dims.at(-1);

    if (!dimensions || dimensions < 1) {
      throw new Error("The model returned an embedding with no dimensions.");
    }

    return dimensions;
  }

  private recordDimensions(dimensions: number) {
    if (
      this.descriptor.dimensions !== null &&
      this.descriptor.dimensions !== dimensions
    ) {
      throw new Error(
        `Embedding dimension changed from ${this.descriptor.dimensions} to ${dimensions}.`,
      );
    }

    this.descriptor.dimensions = dimensions;
  }

  private normalize(vector: number[]): number[] {
    const magnitude = Math.sqrt(
      vector.reduce((sum, value) => sum + value * value, 0),
    );

    if (!Number.isFinite(magnitude) || magnitude === 0) {
      throw new Error("The model returned an invalid zero-length embedding.");
    }

    return vector.map((value) => value / magnitude);
  }
}
