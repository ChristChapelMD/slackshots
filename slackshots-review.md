# SlackShots Project Review

Notes captured while surveying the codebase to prep future fixes. Paths are repo-relative.

## Stack & Architecture
- Next.js 15 app router with HeroUI + Tailwind; Zustand stores for client state; TanStack Query for data fetching.
- Auth via Better Auth (`lib/auth/index.ts`) backed by Mongo (envs `MONGO_URI`, `MONGO_DB_NAME`), plus Slack social provider and a generic Slack OAuth 2.0 config for workspace linking.
- Data layer uses Mongoose models in `services/api/db`, Slack Web API helpers in `services/api/integrations/slack`, and upload orchestration in `services/api/upload`.
- Global providers (`app/providers.tsx`) wire PostHog, React Query, HeroUI, NextThemes. PostHog is initialized unconditionally.

## Routing & Page Structure
- Marketing (`app/(marketing)`): `page.tsx` stitches together `HeroSection`, `FeatureSection`, `HowItWorksSection`, `CTASection`.
  - `components/marketing/layouts/hero-section.tsx` renders a huge wordmark, two CTA buttons (`/dashboard`/`/sign-in`), and a `MediaPlayer` video. The video wrapper is duplicated inside itself and uses `/ss-placeholder-clip.mp4`.
  - `layout.tsx` includes `Navbar` and a footer with links to `/privacy`, `/tos`, `/contact` (none exist) and FontAwesome `<i>` icons without the library loaded.
  - Nav config (`config/site.ts`) links to `/pricing` and uses placeholder social/doc links.
- Auth (`app/(auth)`): `sign-in` and `sign-up` cards over `AnimatedGridPattern`.
  - `sign-in/page.tsx` redirects authenticated users, shows `SlackAuthButton` (Better Auth social Slack), and email/password form.
  - `sign-up/page.tsx` Slack button is a plain link to `/dashboard` (no OAuth). Reset password link is misspelled `/reset-passowrd` and no route exists.
- Dashboard (`app/dashboard`): server-protected via Better Auth session check.
  - Layout wraps `Header` + `Toolbar` + `MainContentContainer` inside `TextureContainer`.
  - `Header` surfaces grid-density, selection controls, and settings drawer trigger.
  - `Toolbar` holds file/folder selector, channel selector, batch-size slider, comment box, and upload button (tabbed on mobile).
  - `MainContentContainer` pulls files via `useFiles`, renders `GridView` (only grid mode implemented), and shows a “Connect a Workspace” prompt that triggers `useWorkspace.addWorkspace`.
- Docs (`app/docs`) and subpages are static placeholders; banner states “Docs Under Construction”. Env examples here reference `MONGODB_URI`/`SLACK_REDIRECT_URI`, which don’t match runtime env names.
- API routes under `app/api`: `auth/[...all]` (Better Auth handler), `upload`, `files`, `channels`, `workspace`, `slack/oauth2_v2/callback`.

## Data Flow Notes
- Auth flow
  - Server: Better Auth initialized with Mongo client, Slack social provider, and `genericOAuth` provider `slack_oauth2_v2`. Trusted origins use `NEXT_PUBLIC_APP_URL`.
  - Client: `authClient` baseURL is `process.env.NEXT_PUBLIC_APP_URL + "/api/auth"` (fails if env missing). `useAuth` exposes sign-in/up/out and Slack social sign-in. Session shape is used inconsistently (`session?.user` vs `session?.session.id` in hooks).
  - Legacy `stores/auth-store.ts`/`useAddBot` expect a separate API host/token and aren’t connected to Better Auth.
- Workspace linking
  - `useWorkspace.addWorkspace` posts to `/api/workspace/add`, which calls Better Auth OAuth2 for `slack_oauth2_v2`.
  - There is also a custom Slack OAuth callback at `app/api/slack/oauth2_v2/callback/route.ts` that exchanges the code, stores workspace + user relation, sets a `lastWorkspaceId` cookie, and redirects to `/dashboard?workspace=...`.
  - `fetchCurrentWorkspace` hits `/api/workspace/current` which only reads the `lastWorkspaceId` cookie; it does **not** verify the user and returns `{ workspace }`. The client types assume a `WorkspaceDTO`, so the hook receives `{workspace: null}` as truthy and may think a workspace exists when it doesn’t.
- File upload pipeline
  - UI: `FileSelector` (`components/dashboard/toolbar/file-selector`) allows files/folder selection with allowed extensions from `upload-form-store`. Channel selection uses `useChannels` (Slack API) but disables channels the bot isn’t a member of; “add bot” uses `useAddBot` against an external host that doesn’t exist in this repo.
  - `useUpload` batches selected files by `messageBatchSize`, assigns an `uploadSessionId`, and posts each batch via `client.upload.uploadBatchToServer` → `/api/upload`.
  - API `/api/upload` looks up the user session, requires `lastWorkspaceId`, loads workspace (with bot token), and calls `api.upload.processAndUpload`.
  - `processAndUpload` creates/updates file records, writes temp files to disk, calls Slack `files.uploadV2`, then records provider IDs/URLs in Mongo. Temp files are cleaned up in `finally`.
- File listing & rendering
  - `useFiles` runs an infinite query on `/api/files?page=n&limit=16`. `GridView` renders `GridItem` → `FileRenderer` → image displays. Only the Image handler is registered (`initializeFileTypeRegistry`), so non-image files will show skeletons.
  - `ImageGridDisplay` builds a URL `/api/files/{providerFileId}`; the proxy route fetches from Slack using the stored `providerFileUrl` and bot token, writes to `/tmp`, and streams back.
  - Selection actions (download/delete) depend on `useFileDownload`/`useFileDelete`, but the corresponding API endpoints (`/api/files` DELETE, `/api/files/download`) are missing.
- State management highlights
  - `ui-store` tracks `gridDensity`/`viewMode` (localStorage-backed).
  - `upload-form-store` holds selected files, channel, comment, batch size, allowed fileTypes.
  - `upload-process-store` tracks uploading/progress but no UI consumes it.
  - `selection-store` manages selection state; drawers use `drawer-store`; `file-store` holds prioritized IDs for image priority loading.

## API Layer & Service Details
- ~~`/api/files` (GET): Requires session + `lastWorkspaceId` cookie but does not use the workspace in the query. Ignores query `page`/`limit` (always defaults to page 1, 16 items), returns `{ files }` only. Errors (unauthorized/missing cookie) are returned as 500 “Internal Server Error”.~~ **Fixed: now validates workspace membership, honors page/limit/fileTypes, returns total/hasMore, and responds with proper status codes.**
- `/api/files/[providerFileId]`: Proxies Slack file download after checking user–workspace relation. Contains debug logs and writes temp files to `/tmp` per request.
- ~~Missing endpoints referenced by the client: DELETE `/api/files` and POST `/api/files/download` (used by `useFileDelete`/`useFileDownload`).~~ **Fixed: DELETE `/api/files` implemented for app-side deletions; multi-download now falls back to sequential per-file downloads.**
- `/api/upload`: Uses `api.upload.processAndUpload`; returns `{ data: uploadResponseArray }`. Errors return 500 with the message.
- `/api/channels`: Reads `lastWorkspaceId`, fetches workspace + bot token, calls Slack conversations.list. No user verification besides session; returns 400/404 JSON errors.
- `/api/workspace/current`: Reads only the cookie, optional 400 when absent. Does not authenticate the user. Returns `{ workspace }`.
- `/api/workspace/add`: Starts Better Auth OAuth2 for `slack_oauth2_v2` with callback `/dashboard`. Parallel to the custom Slack callback flow, which can be confusing.
- `services/api/db`: Mongoose models for `File`, `Workspace`, `UserWorkspace`.
  - `$lookup` in `getAllUserWorkspaces` uses collection `"workspace"` (Mongoose defaults to `workspaces`), so the aggregate likely fails.
  - `getFilesForWorkspace` filters by string `workspaceId` against an ObjectId field.
  - `anonymizeFileRecord` references `slackFileID` fields not present in the schema.
  - Connection/env use `MONGO_URI`; README/docs mention `MONGODB_URI`.
- Slack integration (`services/api/integrations/slack`): helpers for channels, file fetch, upload (sorted file uploads with optional comment).

## UI/UX Observations
- Landing page is heavy (hero video, large text) and contains duplicated video wrapper; “Demo” link routes to nonexistent `/demo`. Footer/social links and `/pricing` 404.
- Navbar social/doc links are placeholders from HeroUI; lack of targetted SlackShots content.
- Auth screens: Sign-up Slack CTA is not wired; reset password route missing; success redirects rely on `NEXT_PUBLIC_APP_URL`.
- Dashboard: Only grid view exists; sentinel divs in `MainContentContainer` include stray `border-red` classes. Selection controls and file drawers assume delete/download APIs exist. Non-image files will not render.
- Settings drawer (`components/drawers/dashboard/settings-drawer.tsx`) is Copilot-generated filler: hardcoded user info, logout points to `/login` (no route), toggles are local only.
- Loading animation fetches `/lottie/loader-3QEaG.json` and throws an error on fetch failure.
- PostHog is initialized even without keys; React Query Devtools rendered in all environments.

## Likely Root Causes of Reported Issues
- Images not showing: ~~`/api/files` requires `lastWorkspaceId` but doesn’t use it; missing cookie yields a 500, and pagination is ignored so infinite query re-fetches page 1 forever.~~ `useFiles` now receives paginated results with proper status handling, but images still depend on successful uploads/Slack fetch; non-image types remain unsupported by renderers.
- Auth “kinks”: Base URL for `authClient` depends on `NEXT_PUBLIC_APP_URL`; `trustedOrigins`/CORS and Mongo env names differ from docs; sign-up Slack CTA is inert; reset-password path missing; session shape used inconsistently in hooks; settings drawer logout uses wrong route.
- Landing page quality: duplicated video container, heavy animations, placeholder/404 links, unused social icons, generic copy in `config/site.ts`.

## File-Specific Hotspots to Revisit
- Routing/UI: `components/marketing/layouts/hero-section.tsx`, `app/(marketing)/layout.tsx`, `config/site.ts`, `components/navbar.tsx`.
- Auth: `app/(auth)/sign-in/page.tsx`, `app/(auth)/sign-up/page.tsx`, `hooks/use-auth.ts`, `lib/auth/client.ts`, `lib/auth/index.ts`.
- Workspace/Slack: `app/api/slack/oauth2_v2/callback/route.ts`, `app/api/workspace/*`, `hooks/use-workspace.ts`, `services/api/db/operations/userworkspace.operation.ts`.
- Files: `app/api/files/route.ts`, `services/client/files.ts`, `hooks/use-files.ts`, `components/dashboard/main/main-content-container.tsx`, `components/file-types/images/displays/*`.
- Uploads: `app/api/upload/route.ts`, `services/api/upload/upload.ts`, `components/dashboard/toolbar/*`, `hooks/use-upload.ts`, `hooks/use-add-bot.ts` (external dependency).
- Deletion/Download gaps: `hooks/use-file-delete.ts`, `hooks/use-file-download.ts`, `components/dashboard/drawers/delete-drawer.tsx` expect endpoints that don’t exist.
- Misc: `services/api/db/operations/workspace.operation.ts` (ObjectId vs string), `services/api/db/operations/userworkspace.operation.ts` ($lookup collection name), `components/drawers/dashboard/settings-drawer.tsx` (placeholder logic), `styles/globals.css` minimal base.
