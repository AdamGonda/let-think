# Think

A Vite + React + TypeScript app with Convex backend and Vercel AI SDK.

## Setup

1. **Install dependencies** (already done):
   ```bash
   npm install
   ```

2. **Initialize Convex** (creates `.env.local` with `VITE_CONVEX_URL`):
   ```bash
   npx convex dev
   ```
   This will prompt you to sign in and create a Convex project. It will generate the `convex/_generated` folder and populate `.env.local`.

3. **Set Anthropic API key** in Convex Dashboard:
   - Go to [dashboard.convex.dev](https://dashboard.convex.dev)
   - Select your project → Settings → Environment Variables
   - Add `ANTHROPIC_API_KEY` with your Anthropic API key (Claude 4.6)

4. **Run the app**:
   ```bash
   # Terminal 1: Convex (push functions, run mutations)
   npm run dev:convex

   # Terminal 2: Vite dev server
   npm run dev
   ```

## Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `VITE_CONVEX_URL` | `.env.local` | Convex deployment URL (auto-set by `npx convex dev`) |
| `ANTHROPIC_API_KEY` | Convex Dashboard | For Claude 4.6 chat (never expose to client) |

Add client-side vars with the `VITE_` prefix in `.env` or `.env.local`. Vite auto-loads `.env`, `.env.local`, `.env.[mode]` and injects `VITE_*` vars at build time.

## Project Structure

```
├── convex/
│   ├── http.ts      # Claude 4.6 chat HTTP action
│   ├── schema.ts    # Sessions & messages tables
│   └── sessions.ts  # Queries & mutations for chat sessions
├── src/
│   ├── components/
│   │   ├── Chat.tsx          # Chat UI with Vercel AI SDK
│   │   └── SessionSidebar.tsx # Session list & new chat
│   └── App.tsx      # Main layout: sidebar + chat
└── .env.example    # Template for required env vars
```
