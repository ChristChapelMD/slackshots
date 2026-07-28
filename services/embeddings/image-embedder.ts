export const DEFAULT_IMAGE_EMBEDDING_MODEL = "Xenova/mobileclip_s2";
export const DEFAULT_IMAGE_EMBEDDING_REVISION =
  "0c311c620b36a2270b851db7bef9135f3eaae5d7";
export const DEFAULT_IMAGE_EMBEDDING_DTYPE = "q8";
export const DEFAULT_IMAGE_EMBEDDING_DIMENSIONS = 512;
export const DEFAULT_IMAGE_EMBEDDING_VERSION = "mobileclip-s2-512-q8-v1";

export interface EmbeddingModelDescriptor {
  modelId: string;
  revision: string;
  dtype: string;
  dimensions: number | null;
}

export interface TextEmbedder {
  readonly descriptor: EmbeddingModelDescriptor;

  embedTexts(texts: string[]): Promise<number[][]>;
}

export interface ImageEmbedder extends TextEmbedder {
  embedImage(image: Blob): Promise<number[]>;
  dispose(): Promise<void>;
}
