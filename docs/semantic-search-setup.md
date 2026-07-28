# Semantic search setup

## Local development

Install dependencies and start SlackShots normally:

```bash
npm install
npm run dev
```

The development command starts Next.js on port 3000 and the local indexer/text
embedding service on `127.0.0.1:3001`. The MobileCLIP files download on first
use and are cached in `.cache/transformers`.

The Settings drawer is the normal control surface for indexing. It reports
worker health and indexed, queued, processing, and failed counts. It can queue
the newest 100 images or the full library, pause/resume job claiming, and retry
terminal failures. These actions create durable MongoDB requests; closing the
drawer or restarting the web process does not discard them.

Useful commands:

```bash
# Measure a model against recent Slack images without writing vectors
npm run benchmark:embeddings -- --limit=25

# Create/repair durable jobs without processing them
npm run index:enqueue-all

# Enqueue and process every existing image, exiting when the queue is empty
npm run index:all

# Run the persistent worker and private text-embedding endpoint
npm run index:worker

# Smoke-test only one image
npm run index:all -- --limit=1

# Smoke-test the most recently uploaded image
npm run index:all -- --limit=1 --newest

# Deliberately rebuild the current model version
npm run index:all -- --force
```

`index:all` is resumable. Re-running it skips completed records and continues
missing or failed work.

## MongoDB Atlas Vector Search

Create a MongoDB Vector Search index on the `image_indexes` collection. Name it
`image_semantic_v1` and use this definition:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 512,
      "similarity": "dotProduct"
    },
    {
      "type": "filter",
      "path": "workspaceId"
    },
    {
      "type": "filter",
      "path": "indexVersion"
    },
    {
      "type": "filter",
      "path": "status"
    }
  ]
}
```

The repository includes an idempotent command that creates this definition and
waits for Atlas to report it ready:

```bash
npm run search:index:create
```

The stored vectors are unit-normalized, so dot product ranks them by cosine
similarity without repeated normalization.

If a different index name is used, set:

```bash
MONGO_IMAGE_VECTOR_INDEX_NAME=your_index_name
```

Wait until Atlas reports the index as ready. During `next dev`, SlackShots uses
an exact Mongo-backed fallback when the Atlas search index is absent. Production
does not fall back unless explicitly enabled:

```bash
VECTOR_SEARCH_EXACT_FALLBACK=true
```

That fallback reads at most 5,000 completed vectors and is for development or
small private deployments, not the intended hosted path.

## Indexer service configuration

Local defaults require no new environment variables:

```bash
EMBEDDING_SERVICE_URL=http://127.0.0.1:3001
EMBEDDING_SERVICE_HOST=127.0.0.1
EMBEDDING_SERVICE_PORT=3001
TRANSFORMERS_CACHE_DIR=.cache/transformers
```

When the indexer is deployed on a non-loopback interface, set the same
high-entropy secret in the web and indexer environments:

```bash
EMBEDDING_SERVICE_TOKEN=replace_with_a_secret
```

The indexer refuses to bind beyond localhost without this token. Network-level
private access should still be used in a hosted deployment.

## Deployment roles

Run these as separate process types from the same source revision:

```bash
# Web
npm run start

# Worker/model service
npm run index:worker
```

Only the worker needs model cache persistence. Both roles need `MONGO_URI`; the
worker also needs the Slack workspace token already stored in the workspace
record. The web role never receives raw embeddings from the browser, and the
model endpoint should not be public.
