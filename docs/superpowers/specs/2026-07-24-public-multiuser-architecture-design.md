# UNA Public Multi-User Architecture Design

## Goal

Evolve UNA from a local, client-supplied-user-ID application into a public APK-backed service. Each registered user can use the same public backend from any network while seeing only their own conversations, memories, diary, private UNA social feed, audio, and images.

## Scope

The first public release supports username-and-password registration and login. It does not support real-user friendships, cross-user social feeds, password recovery, email verification, or third-party sign-in. A user's social feed contains only that user and that user's UNA.

## Global Constraints

- Keep FastAPI, React/Vite, SQLite, ChromaDB, HBuilder APK packaging, and the existing Live2D/audio pipeline.
- All protected API and WebSocket identity comes from server-validated credentials; clients never select an effective user ID.
- Existing local data owned by `default` or `mobile_user` must be migratable to the first registered account.
- Public deployment uses HTTPS and WSS behind a reverse proxy, with one Uvicorn worker while SQLite and in-memory ticket state are used.
- Tests must use temporary SQLite and ChromaDB paths and must never modify `backend/una_memory.db`.

## Authentication and Session Model

### Account records

Use an immutable UUID for the internal user ID. Store a case-insensitive unique username, an Argon2id password hash, `is_active`, and timestamps. Existing SHA-256 password data is not reused for new authentication; existing local data is migrated by an explicit administrator-selected mapping.

Add a refresh-session table storing only a hash of each random refresh token, user ID, expiry, creation time, revocation time, and optional device label. A refresh-token rotation revokes the used record and creates a replacement.

### Tokens

- Access token: signed JWT, 15 minute lifetime, containing user UUID and token type `access`.
- Refresh token: random opaque value, 30 day lifetime, sent only to refresh or logout endpoints and stored server-side as a hash.
- WebSocket ticket: one-time, random opaque value with 60 second lifetime, tied to the authenticated user. It is consumed on successful WebSocket connection.

The APK stores the short-lived access token in memory and the refresh token through a platform secure-storage adapter. Long-lived credentials must not be placed in plain browser `localStorage`.

### API contract

- `POST /api/auth/register`: validates username and password, creates an account, returns an access/refresh token pair.
- `POST /api/auth/login`: validates credentials and returns a token pair.
- `POST /api/auth/refresh`: rotates a valid refresh token and returns a new token pair.
- `POST /api/auth/logout`: revokes the presented refresh token.
- `GET /api/auth/me`: returns the authenticated account profile.
- `POST /api/auth/ws-ticket`: requires an access token and returns a one-time ticket.

HTTP requests use `Authorization: Bearer <access token>`. The WebSocket connection uses only the short-lived ticket as a query parameter; it never puts an access or refresh token in the URL.

Registration and login have bounded per-IP and per-username rate limits. Responses never reveal whether a username or password was the invalid credential.

## Authorization and Data Isolation

Create a `CurrentUser` FastAPI dependency that verifies the access token and returns the database user. Every protected route obtains its effective user ID exclusively through this dependency.

The following client-supplied fields are removed or ignored: `user_id`, `owner_user_id`, `author_id`, and user-controlled AI author types. The server derives them from `CurrentUser`.

All SQLite reads and writes are filtered by user UUID. ChromaDB collection names derive from the UUID. The scheduled diary and UNA social-post jobs iterate active registered users and perform each operation in that user's scope.

The social feed is private by design: posts use `owner_user_id = CurrentUser.id`; a user may create their own post and view their own posts plus UNA's posts for that same owner. Friend and cross-user profile endpoints are removed from the APK-facing API surface.

## Private Media

Public static hosting remains limited to the React bundle, Live2D models, backgrounds, and other non-user assets. User audio, diary images, and uploaded social images are served through protected media endpoints.

Each media database record carries owner UUID, media kind, filesystem path, and creation timestamp. A media endpoint verifies `CurrentUser.id` before streaming a file. Chat history and diary responses return authenticated media URLs, never raw `/static/voice/...` paths.

Audio maintenance deletes only media older than the configured retention period that is no longer referenced by a chat message. It cleans temporary WAV and Rhubarb JSON files on both success and failure paths. Diary images are retained until an explicit user-facing retention feature exists.

## Conversation and Realtime Protocol

### Text de-duplication

Each client text message includes a UUID `client_message_id`. The client shows an optimistic message with that ID. The server echoes the same ID in `user_sync`; the client confirms and updates its optimistic message instead of appending a duplicate. Server-originated ASR text has no client ID and is appended normally.

### Vision output

`POST /api/vision_chat` accepts an image and immediately returns acknowledgement only. The final text, motion, audio chunks, visemes, and completion event are sent only through the user's WebSocket connection. The client renders the image immediately but never creates a second AI response from the HTTP response.

### WebSocket sequence

1. APK obtains a one-time WebSocket ticket over authenticated HTTPS.
2. APK connects with the ticket; the server consumes it before accepting the socket.
3. All incoming user events are bound to the ticket owner.
4. Streaming output uses the existing `text_stream_chunk`, `audio_stream_chunk`, `chat_action`, and `audio_stream_end` protocol, plus correlation IDs where needed.
5. A disconnected client reconnects by obtaining a new ticket.

## Mood Intervention

`mood_score` is defined as the LLM's estimate of the user's current emotional state, stored with the corresponding AI response. The intervention check reads recent AI scores, not user rows that currently carry `0`.

Enter gentle intervention when at least three of the latest five valid scores are `<= -2`. Crisis-keyword handling remains independent and has priority. The chart reads the same AI score series.

## Frontend and Deployment Configuration

Replace hard-coded IP addresses with build-time configuration:

- `VITE_API_BASE_URL` is the public HTTPS origin in APK builds.
- Browser development uses the Vite proxy when the variable is absent.
- WebSocket origin derives from API origin and switches `https` to `wss` automatically.

Server secrets and service URLs are injected with environment variables and local private configuration. Commit a redacted example configuration only. CORS is an allowlist for the public web origin and the expected APK/WebView origin; token verification remains the security boundary.

Deploy FastAPI behind Caddy or Nginx for TLS termination and WSS proxying. Persist SQLite, ChromaDB, protected media, and generated diary images on a mounted server volume. Run one Uvicorn worker in the first release.

## Migration

Use an explicit schema-migration registry in SQLite. Migrations are idempotent and transactional where SQLite allows it.

At first administrator login, select the historical user IDs to merge. Update their chat, profile, diary, social, and Chroma collection ownership to the new UUID. Preserve original message timestamps and media references. Do not delete original rows until migration verification reports matching record counts.

## Testing and Acceptance Criteria

- Registration rejects duplicate usernames and weak passwords; login issues a valid session.
- A token for user A cannot read, post, upload, fetch media, or connect a WebSocket as user B.
- Two users receive separate chat history, Chroma recall, diaries, mood charts, and UNA social feeds.
- Sending a text message results in one rendered user message after the server echo.
- Sending an image produces one AI response, delivered by WebSocket only.
- Three low AI mood scores within the most recent five enable gentle intervention; ordinary user rows with zero scores do not affect it.
- Every backend test uses a temporary SQLite database and temporary ChromaDB directory.
- A user can log in on a phone and a computer on different networks and see the same server-side data.

## Non-Goals for This Release

- Human-to-human friendship, search, messaging, and shared social feeds.
- Email verification, password reset, phone verification, and third-party sign-in.
- Horizontal multi-worker SQLite deployment.
- Automatic deletion of diary images or user-visible retention settings.
