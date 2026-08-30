# Agent notes

## Cursor Cloud specific instructions

The authenticated workspace is gated by Google OAuth and a beta allowlist. Cloud agents cannot complete Google sign-in.

**Before any browser / UI verification of `/app`:**

1. Use the anonymous local backend already described in `.cursor/environment.json` (`CONVEX_AGENT_MODE=anonymous`). Vite is on port `5173`.
2. Follow [docs/agent-local-login.md](docs/agent-local-login.md) end to end: set JWT keys on the anonymous deployment, seed a demo user with a throwaway `convex/devSeed.ts` (delete it after), mint tokens via `auth:store`, then install the JWT + refresh token in the browser `localStorage` and open `/app`.

Do not invent another login path. Do not commit `convex/devSeed.ts` or other throwaway seed files from that guide.

That flow only unlocks the authenticated UI. Chat/AI still needs `GOOGLE_GENERATIVE_AI_API_KEY` on the Convex env.

The same pointer is also an always-on project rule (`.cursor/rules/cloud-agent-auth.mdc`) and a repo skill (`.cursor/skills/agent-local-login/SKILL.md`) so Cloud Agents pick it up even when they skip this file.
