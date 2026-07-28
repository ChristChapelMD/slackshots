# Semantic image search and face indexing

This document records the implemented semantic-search architecture and the
planned face-indexing extension. Slack remains the only durable store for image
bytes.

## What is implemented

The dashboard header contains a search control. Opening it shows a contained
Spotlight-style palette over the dashboard grid. Natural-language queries are
embedded with the same MobileCLIP model used to embed Slack images. Selecting a
result opens the existing full-resolution image viewer.

The current model identity is immutable:

- model: `Xenova/mobileclip_s2`
- Hugging Face revision: `0c311c620b36a2270b851db7bef9135f3eaae5d7`
- dtype: `q8`
- dimensions: `512`
- application index version: `mobileclip-s2-512-q8-v1`

The five-image baseline completed without failures at about 1.1 seconds per
image on the development machine. Loading both model halves increased process
RSS by about 814 MB, which is why inference is isolated from Next.js.

## Runtime boundaries

The repository contains two runtime roles:

1. The Next.js process handles authentication, uploads, Slack file proxying,
   vector queries, and the dashboard.
2. The indexer process handles local model inference, durable indexing jobs,
   and a localhost/private text-embedding endpoint.

`npm run dev` starts both roles. They remain in one repository and share model
and database contracts, but the indexer can later be deployed separately
without moving feature logic out of routes.

The web process never imports the ONNX runtime. Search requests call the
indexer's text-embedding endpoint, while image jobs use the vision encoder in
the same indexer process.

## Storage boundary

SlackShots durably stores:

- Slack file IDs and private source/thumbnail URLs
- dimensions, MIME type, size, uploader, timestamps, and channel IDs
- image embeddings and immutable model/version metadata
- indexing status, retry state, leases, and safe error codes
- future captions, OCR text, tags, and face-derived metadata

The indexer prefers Slack thumbnails and holds downloaded/decoded bytes only in
memory. It does not write image bytes to MongoDB or the filesystem. Slack
remains the source of truth.

## Durable processing pipeline

1. Upload the file to Slack.
2. Persist the Slack file record and thumbnail metadata.
3. Upsert an `image_indexes` record.
4. Upsert an `indexing_jobs` record containing Mongo IDs only.
5. A worker atomically claims one job with a 30-minute lease.
6. It refreshes an expired Slack URL when necessary and downloads a thumbnail.
7. It generates one normalized image embedding.
8. It writes the vector and marks both records complete.
9. On failure it records a safe code, applies exponential backoff, and retries
   up to five times.

Jobs are idempotent by workspace, file, job kind, and index version. An expired
processing lease can be reclaimed after a crash. Running the backfill again
skips completed records and repairs missing work.

## Collections

`image_indexes` has one record per
`workspaceId + fileRecordId + indexVersion`. It stores:

- Slack and application file IDs
- status: `PENDING`, `PROCESSING`, `COMPLETE`, `FAILED`, or `STALE`
- embedding and complete model identity
- uploader, channel, dimensions, type, and creation metadata
- extension fields for captions, OCR text, and tags

`indexing_jobs` has one record per
`workspaceId + fileRecordId + job kind + indexVersion`. It stores priority,
attempt count, retry availability, lease ownership, and completion state.
Tokens and Slack URLs are deliberately excluded from jobs.

`indexing_requests` stores user-triggered backfills from the Settings drawer.
The worker expands each durable request into idempotent per-image jobs.

`indexing_controls` stores the workspace pause state and worker heartbeat.
Pausing lets an active image finish but prevents workers from claiming another
backfill or image job.

Deleting an application file also deletes its index records and jobs. Deleting
a Slack file through SlackShots preserves the same cleanup behavior.

## Vector search

`ImageVectorIndex` isolates vector persistence and retrieval from routes and
workers. `MongoImageVectorIndex` currently provides:

- guarded embedding upserts
- Atlas `$vectorSearch`
- development-only exact search when the Atlas index is not ready
- vector deletion by workspace and file IDs

Atlas queries are always filtered by workspace, model index version, and
complete status. Search API responses contain application metadata and Slack
file IDs, never private Slack URLs or bot tokens.

See `semantic-search-setup.md` for the Atlas definition and operating commands.

## Next ranking phase

Natural-language similarity is the first ranking signal. The next compatible
phase is hybrid ranking:

1. vector similarity
2. exact boosts for person, uploader, date, channel, and tags
3. caption/OCR lexical score
4. recency as a small tie-breaker

Filters should be parsed into a typed search request rather than appended to
the natural-language prompt. Development responses can then expose each score
contribution for tuning.

## Face indexing extension

Face processing should reuse the durable job and model-service boundaries, but
must use a separate index version and records:

- `FaceDetector`: boxes and confidence
- `FaceEmbedder`: identity-similarity vectors
- `FaceClusterer`: workspace-scoped groups without identity claims
- `Person`: user-supplied name and representative face references

The command palette can later add face-cluster thumbnails as structured
filters. Clicking an unnamed cluster can show its images and offer an explicit
name action; names then become searchable filter terms.

Face embeddings are biometric metadata. Before implementation, add a
workspace-level opt-in, an explanation of processing, deletion by file/person/
workspace, and an audit of access control. SlackShots must never infer or claim
a person's real identity automatically.
