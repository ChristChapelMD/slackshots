# SlackShots architecture note

The current dashboard uses:

- React Query cursor pagination for Slack file records
- row virtualization for the responsive image grid
- Slack thumbnail proxying with private browser caching
- a contained HeroUI file modal for image and metadata display
- a sequential client upload queue with richer job progress
- Better Auth Slack login plus workspace membership authorization

The main file flow is:

```text
authenticated member
  -> workspace-scoped file query
  -> cursor-paginated metadata
  -> virtualized grid row
  -> cached Slack thumbnail proxy
  -> contained full-image modal on click
```

Slack remains the durable image store. MongoDB holds file references, uploader
information, dimensions, processing state, and other derived metadata.

The reusable files/folder tabs are documented in
`docs/file-folder-selector-tabs.md`. The proposed semantic and face-search
pipeline is documented in `docs/search-and-face-indexing-architecture.md`.
