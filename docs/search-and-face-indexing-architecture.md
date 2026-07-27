# Semantic image search and face indexing

This document describes the recommended next feature phase. It intentionally
does not add model runtimes or vector infrastructure to the current cleanup.

## Product experience

Place one search control in the dashboard header. Clicking or focusing it opens
a contained Spotlight-style command palette over the dashboard content.

The palette should support three compatible result modes:

1. Natural-language search, such as "sunset behind the church with people in
   the foreground."
2. Structured metadata filters, such as uploader, date, file type, dimensions,
   or channel.
3. People filters, represented by face-cluster thumbnails and optional names.

Selecting a person applies that person as a filter. Unnamed clusters can be
named by the user, after which names become searchable terms.

## Storage boundary

Slack remains the only durable store for image bytes.

SlackShots may durably store:

- Slack file IDs and private source/thumbnail URLs
- dimensions, MIME type, size, uploader, timestamps, and channel IDs
- captions, OCR text, perceptual hashes, tags, and model versions
- image embedding vectors
- face embedding vectors, bounding boxes, cluster IDs, and user-supplied names
- indexing state and errors

Workers may hold an image in memory or an operating-system temporary file
during processing. Temporary bytes must be deleted after each job, including
failure and cancellation paths.

## Processing pipeline

Heavy processing should not block the visible Slack upload.

1. Upload the file to Slack.
2. Persist the Slack file record and thumbnail metadata.
3. Enqueue an indexing job containing only the workspace and Slack file IDs.
4. A worker retrieves the image from Slack with the workspace bot token.
5. Decode once and fan out the in-memory pixels to metadata, embedding, OCR,
   and optional face-processing stages.
6. Write derived metadata and vectors.
7. Discard all decoded and temporary image bytes.
8. Mark the record searchable and refresh active search results.

This makes upload latency predictable and allows indexing retries without
creating duplicate Slack files. The current in-browser upload queue can later
surface a separate "Indexing" phase without holding the upload request open.

## Suggested model boundaries

Keep model implementations behind interfaces so model choices do not leak into
routes or UI components:

- `ImageEmbedder`: CLIP or SigLIP-style text/image embeddings
- `ImageCaptioner`: optional image-to-text caption generation
- `TextExtractor`: optional OCR
- `FaceDetector`: face boxes and confidence
- `FaceEmbedder`: an ArcFace-style identity embedding
- `FaceClusterer`: groups embeddings without assigning a real identity

Record the model name and version with every vector. A model change requires a
new index version and background re-index, not an in-place mixture of vector
spaces.

## Vector storage

Use a `VectorIndex` interface with at least:

- `upsertImageEmbedding`
- `searchImages`
- `upsertFaceEmbeddings`
- `searchFaces`
- `deleteFileVectors`

MongoDB Atlas Vector Search is the simplest hosted fit with the current
database. Local MongoDB deployments may instead use a local Qdrant service.
Keeping the interface narrow allows the local and hosted backends to differ
without affecting uploads or UI.

## Metadata shape

An image-index record should be keyed by `workspaceId + fileRecordId` and
contain:

- `status`: queued, processing, ready, failed, or stale
- `imageEmbedding`, `embeddingModel`, and `embeddingVersion`
- `caption`, `ocrText`, and normalized searchable tags
- `width`, `height`, perceptual hash, and dominant colors
- `faces[]`: bounding box, confidence, embedding, cluster ID, and optional
  person ID
- `indexedAt`, retry count, and a safe error code

A separate person record should contain only a workspace-scoped ID, a
user-supplied name, representative face references, and timestamps.

## Face-data safeguards

Face embeddings are biometric metadata even though they cannot recreate the
source image reliably. Face indexing should therefore be:

- disabled until explicitly enabled for the workspace
- processed locally or in a specifically approved private service
- described clearly before enabling
- deletable per file, person, or entire workspace
- protected by the same workspace membership checks as source images

The system should cluster similar faces and let the user provide names. It
should not infer or claim a person's real identity automatically.

## Search ranking

Use hybrid ranking rather than embeddings alone:

1. vector similarity between query text and image embedding
2. exact boosts for person, uploader, date, channel, and tags
3. optional caption/OCR text score
4. a recency tie-breaker

Return the individual score contributions in development so ranking behavior
can be tuned from the command palette.
