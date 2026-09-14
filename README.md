<p align="center">
  <img src="public/lt-logo.png" width="88" alt="LET THINK" />
</p>

<h1 align="center">LET THINK</h1>

<p align="center"><strong>Pure ideas from AI — no sycophantic flattery.</strong></p>

<p align="center">
  <a href="https://letthink.co">letthink.co</a>
  ·
  <a href="https://tally.so/r/D4v9jE">Apply for beta</a>
  ·
  <a href="https://discord.gg/FkKQDdRf">Discord</a>
</p>

---

LET THINK started as **Ideator**: a thinking workspace that refused to dump ideas into a linear chat log. Each exchange became an evolving concept graph. You could see the ideas, step back through them, and continue from a specific one with `@1`.

That graph-first loop is still the heart of the product. The idea just outgrew a single surface.

Thinking is not one mode. You sketch, you talk, you generate, you write. Forcing all of that through Ideate made less and less sense — so the workspace split.

## Four views, one thought

Every file now has four dedicated views. Switch between them; the thought stays one file.

- **Draw** — infinite canvas (pen, text, frames). For marks that are not sentences yet. Frame a region and it becomes a named `@slug` you can hand to the model.
- **Chat** — ordinary conversation, many threads per file. Linear on purpose. Talking without rewriting the graph. Reference the graph, the writing, or the canvas when you need them; otherwise it stays out of the way.
- **Ideate** — the original concept graph. Each turn still grows a batch of concept cards. Step through prior batches. Continue from a card with `@1`. History is inspectable; new input stays anchored to the latest step so you do not accidentally fork the past.
- **Write** — long-form markdown for the same file. Notes used to live in the margin of the graph. They grew into their own editor — headings, folds, the actual artifact you are trying to finish.

The views are separate so each one can be itself. They stay connected so you are not copy-pasting between four apps:

```
@writing   @graph   @canvas   @1
```

Type `@` in Chat or Ideate and attach the writing, the graph, the canvas, a framed sketch, or a numbered concept. The model sees what you pointed at. The other rooms stay intact.

<p align="center">
  <a href="https://www.youtube.com/watch?v=IY2bOSbtwPE">
    <img src="https://img.youtube.com/vi/IY2bOSbtwPE/maxresdefault.jpg" alt="LET THINK product demo" />
  </a>
</p>

<p align="center"><em>Watch the demo →</em></p>

## Why this exists

Linear chat is a tape. Useful for talking. Bad for thinking. Ideas bury themselves, you cannot point at a concept without quoting a paragraph, and the model keeps flattering you instead of sharpening the work.

LET THINK is built for the opposite: visible ideas, named references, and a model that is supposed to think with you — not agree with you.

Beta is invite-only. We read every application.

**[Apply for beta access](https://tally.so/r/D4v9jE)** · **[Open LET THINK](https://letthink.co)**

## Stack

React, Vite, TanStack Router, Convex, Gemini. Google sign-in. Hosted on Netlify.

## Run locally

```bash
npm install
npx convex dev          # creates .env.local with VITE_CONVEX_URL
```

Set these on the Convex deployment (Dashboard → Settings → Environment Variables, or `npx convex env set`):

| Variable | Where | What |
| --- | --- | --- |
| `VITE_CONVEX_URL` | `.env.local` (local); Netlify **build** env (prod) | Convex URL. `npx convex dev` writes it locally. Must exist **at build time** for static hosting. |
| `CONVEX_SITE_URL` | Convex | App origin (`http://localhost:5173` locally). Auth callbacks use this. |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Convex | Gemini for chat and concept graphs. |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Convex | [Google OAuth](https://console.cloud.google.com/apis/credentials) client. |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Convex | Transactional email (allowlist). `RESEND_REPLY_TO` is optional. |

Then:

```bash
npm run dev             # Vite + convex dev
```

Put secrets in Convex, not in Vite. Only `VITE_*` values belong in `.env.local`.

Headless / agent login (no Google OAuth): [docs/agent-local-login.md](docs/agent-local-login.md).

### Deploy (Netlify)

`netlify.toml` already sets `npm run build` → `dist`. Connect the repo, then set `VITE_CONVEX_URL` as a **build** env var to the matching Convex deployment (prod URL on the production branch; a separate dev deployment for previews). Set `CONVEX_SITE_URL` on each Convex deployment to the matching site origin so OAuth redirects stay consistent.

If `VITE_CONVEX_URL` is missing at build time, the SPA ships with an empty URL and cannot talk to Convex.

## License

Source is public. The product is not open source. © let-think. All rights reserved.
