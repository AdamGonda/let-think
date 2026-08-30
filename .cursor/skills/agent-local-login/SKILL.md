---
name: agent-local-login
description: Authenticate a Cloud Agent against the local anonymous Convex backend before browser-testing /app. Use when verifying UI, opening /app, or minting a Convex Auth session. Google OAuth cannot be automated.
---

# Agent local login

Read and follow [docs/agent-local-login.md](../../../docs/agent-local-login.md) immediately. That file is the only login procedure.

Summary (do not skip the doc):

1. Use `CONVEX_AGENT_MODE=anonymous` (see `.cursor/environment.json`). Vite is on `5173`.
2. Set JWT keys on the anonymous deployment if missing.
3. Seed a demo user with a throwaway `convex/devSeed.ts`, mint tokens via `auth:store`, then delete the seed file.
4. Install the JWT + refresh token in browser `localStorage` and open `/app`.

Do not invent another login path. Do not commit `convex/devSeed.ts`. Chat/AI still needs `GOOGLE_GENERATIVE_AI_API_KEY`.
