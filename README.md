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

3. **Set server environment variables** in Convex Dashboard
   - Open [dashboard.convex.dev](https://dashboard.convex.dev)
   - Project -> Settings -> Environment Variables
   - Add `GOOGLE_GENERATIVE_AI_API_KEY` (used by chat actions)

4. **Run the app**
   ```bash
   npm run dev
   ```
   `npm run dev` starts both Vite and `npx convex dev` concurrently.

## Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `VITE_CONVEX_URL` | `.env.local` | Convex deployment URL (auto-set by `npx convex dev`) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Convex Dashboard | Server-side LLM key for chat + concept graph generation |

Use the `VITE_` prefix only for client-safe values.

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
