# Think

Think won't blast you with a bunch of text. It will help you think through a problem
by breaking it down into smaller concepts.
it does not try to look smart, and act like a conscious AI
it is an honest take on the use of the underlying technology of LLMs.

no emotional manipulation from the model to think you are the best and smartest.
hopefully it won't hallucinate as much.
and cause mass hysteria and delusion.

we use a reasoning model to generate around the user input
and distill it and evolving context graph. 

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

3. **Set Google AI API key** in Convex Dashboard:
   - Go to [dashboard.convex.dev](https://dashboard.convex.dev)
   - Select your project → Settings → Environment Variables
   - Add `GOOGLE_GENERATIVE_AI_API_KEY` with your Google AI API key (Gemini 3.1 Pro Preview)

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
| `GOOGLE_GENERATIVE_AI_API_KEY` | Convex Dashboard | For Gemini 3.1 Pro Preview chat (never expose to client) |

Add client-side vars with the `VITE_` prefix in `.env` or `.env.local`. Vite auto-loads `.env`, `.env.local`, `.env.[mode]` and injects `VITE_*` vars at build time.

## Project Structure

```
├── convex/
│   ├── http.ts      # HTTP router
│   ├── schema.ts    # Sessions & messages tables
│   └── sessions.ts  # Queries & mutations for chat sessions
├── src/
│   ├── components/
│   │   ├── Chat.tsx          # Chat UI with Vercel AI SDK
│   │   └── SessionSidebar.tsx # Session list & new chat
│   └── App.tsx      # Main layout: sidebar + chat
└── .env.example    # Template for required env vars
```
