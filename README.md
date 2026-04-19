# Think

Think is a focused thinking workspace.  
Instead of only generating chat text, it turns each exchange into an evolving concept graph so you can branch ideas, revisit prior steps, and continue from specific concepts.

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Initialize Convex** (creates `.env.local` with `VITE_CONVEX_URL`)
   ```bash
   npx convex dev
   ```
   This prompts sign-in, creates/selects a Convex project, and generates `convex/_generated`.

3. **Set Convex environment variables** (Dashboard → Project → Settings → Environment Variables, or `npx convex env set`)
   - `GOOGLE_GENERATIVE_AI_API_KEY` — Gemini for chat and concept graph generation
   - `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` — Google OAuth (from [Google Cloud Console](https://console.cloud.google.com/apis/credentials))
   - `CONVEX_SITE_URL` — your app origin (e.g. `http://localhost:5173` locally, production site URL in prod); must match what you use in the browser for auth callbacks

4. **Run the app**
   ```bash
   npm run dev
   ```
   `npm run dev` starts both Vite and `npx convex dev` concurrently.

## Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `VITE_CONVEX_URL` | `.env.local` (local); **Netlify build env** (production) | Convex deployment URL. Set automatically by `npx convex dev` locally. For static hosting, must be present **at build time** so Vite embeds it in the client bundle. |
| `CONVEX_SITE_URL` | Convex Dashboard (per deployment) | Public origin of your app (`http://localhost:5173` in dev, production URL in prod). Used by `convex/auth.config.ts` for Convex Auth. |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Convex Dashboard | Server-side Gemini API key for chat actions and topic summaries. |
| `AUTH_GOOGLE_ID` | Convex Dashboard | Google OAuth client ID. |
| `AUTH_GOOGLE_SECRET` | Convex Dashboard | Google OAuth client secret. |

Use the `VITE_` prefix only for client-safe values in `.env.local`. Secrets (`AUTH_*`, `GOOGLE_*`, `CONVEX_SITE_URL` for server) belong in Convex, not in the frontend env.

## Deployment (Netlify)

The repo includes [`netlify.toml`](netlify.toml): build command `npm run build`, publish directory `dist`.

1. **Connect the repo** in Netlify and use the default settings from `netlify.toml` (or equivalent).
2. **Set `VITE_CONVEX_URL` in Netlify** under Site configuration → Environment variables → **Build** (or “All scopes” including builds). Use the Convex deployment URL for that environment:
   - **Production branch:** URL of your **production** Convex deployment (from the Convex dashboard).
   - **Deploy previews / branch deploys:** Either point at a **dev** Convex deployment used for previews, or add per-branch values if you use [Netlify’s multiple deploy contexts](https://docs.netlify.com/environment-variables/get-started/#scopes) so preview builds don’t call production Convex by mistake.
3. **Convex:** For each Convex deployment (dev/prod), set `CONVEX_SITE_URL` to the matching site origin (e.g. preview URL vs production domain) so OAuth redirects stay consistent.

If `VITE_CONVEX_URL` is missing at build time, the SPA will bundle an empty URL and fail to connect to Convex in the browser.

## App Tutorial (In-Product)

The onboarding tutorial is implemented in `src/components/Tutorial.tsx` and launched automatically for first-time users.

It currently covers:
- Main workspace and graph-first flow
- Creating sessions and projects from the sidebar
- Switching between graph and project-notes list views
- Chat input with `@` concept references
- Wake-up note-taking and history navigation

You can replay it from the sidebar ("Run tutorial"), which dispatches the `think:run-tutorial` event.

## Architecture (Current)

### Frontend

- `src/App.tsx` gates the app by Convex auth state, then mounts providers and workspace content.
- `AppUiProvider` + UI actor hooks coordinate view state (graph/list mode, overlays, selected batch, loading frames, history panel, editor state).
- `SessionDataProvider` loads session-bound data (messages, graph, interaction caps, timers, pagination).
- `AppContentBody` composes the shell:
  - `SessionSidebar` for projects/sessions/navigation actions
  - Graph/list surface (`AppContentGraphSurface` or `NotesListPanel`)
  - `Chat` composer (or `HistoricalBatchPrompt` when browsing earlier graph batches)
  - overlays (`WakeUpOverlay`, rest walkthrough, tutorial)

### Backend (Convex)

- `convex/schema.ts` models:
  - `projects`, `sessions`, `messages`
  - `sessionConceptGraphs` (graph stored separate from session row)
  - interaction tracking tables for think/work mode
- `convex/sessions.ts` handles secure session/message CRUD, draft/notes persistence, paginated message history, and concept graph persistence.
- `convex/chatPipeline.ts` defines LLM pre/post processing:
  - injects system prompt and optional selected-concept context
  - extracts concept graph JSON from assistant output
  - strips graph block from user-visible assistant text

### Runtime Flow

1. User sends prompt in `Chat`.
2. Backend action runs chat pipeline and persists user/assistant messages.
3. Extracted concept graph is merged/persisted per session.
4. UI re-renders graph + batch navigation; users can reference concept nodes via `@N` in the next prompt.

## High-Level Structure

```
├── convex/
│   ├── schema.ts              # Data model + indexes
│   ├── sessions.ts            # Session/message queries and mutations
│   ├── chat.ts                # Chat actions (send, topic generation)
│   └── chatPipeline.ts        # LLM pre/post processing and graph extraction
├── src/
│   ├── App.tsx                # Auth gating + provider composition
│   ├── components/
│   │   ├── AppContentBody.tsx # Main shell layout and panel orchestration
│   │   ├── SessionSidebar.tsx # Session/project navigation UI
│   │   ├── Tutorial.tsx       # Driver.js onboarding tour
│   │   └── chat/Chat.tsx      # Composer + send flow
│   ├── contexts/              # App UI + session data providers
│   ├── hooks/                 # UI selectors, handlers, sync hooks
│   └── lib/                   # Storage, mentions, graph helpers, auth utilities
└── package.json               # Scripts and dependencies
```
