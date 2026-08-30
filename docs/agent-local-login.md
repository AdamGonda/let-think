# Logging in locally (for agents / headless dev)

The app gates its workspace behind **Google OAuth + a beta allowlist** (see `convex/auth.ts`).
Real Google sign-in can't be automated (Google blocks headless OAuth) and needs
`AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`. For local/cloud-agent dev you usually just need to
*see the authenticated workspace*, so instead of Google we mint a real Convex Auth session
directly against the local anonymous backend we control.

This works because `npx convex run` executes with admin rights and can call `internal`
functions, and Convex Auth issues normal RS256 JWTs that the client validates against the
deployment's own JWKS.

> Scope: local **anonymous** Convex backend only (`CONVEX_AGENT_MODE=anonymous`). Never do
> this against a shared/prod deployment. Nothing here should be committed to app code.

## Prerequisites

- Deps installed and dev running: `CONVEX_AGENT_MODE=anonymous npm run dev`
  (Vite on `5173`, local Convex backend on `3210`; `.env.local` holds `VITE_CONVEX_URL`).
- Run all commands below from the repo root with `export CONVEX_AGENT_MODE=anonymous`.

## Step 1 — Initialize Convex Auth keys (once per local backend)

A fresh anonymous backend has **no** auth keys, so *no* login works until you set them.
`npx convex env list` will show nothing. Generate an RS256 keypair (same format the
`npx @convex-dev/auth` initializer uses) and set it:

```bash
export CONVEX_AGENT_MODE=anonymous

# Generate keys with the project's bundled `jose`, then set them on the deployment.
node -e '
import("jose").then(async ({ generateKeyPair, exportPKCS8, exportJWK }) => {
  const { publicKey, privateKey } = await generateKeyPair("RS256", { extractable: true });
  const pkcs8 = (await exportPKCS8(privateKey)).trimEnd().replace(/\n/g, " ");
  const jwks = JSON.stringify({ keys: [{ use: "sig", ...(await exportJWK(publicKey)) }] });
  require("fs").writeFileSync("/tmp/jwtpk.txt", pkcs8);
  require("fs").writeFileSync("/tmp/jwks.txt", jwks);
})'
npx convex env set JWT_PRIVATE_KEY -- "$(cat /tmp/jwtpk.txt)"
npx convex env set JWKS           -- "$(cat /tmp/jwks.txt)"
rm -f /tmp/jwtpk.txt /tmp/jwks.txt
```

Notes:
- The JWT issuer/audience come from the Convex system var `CONVEX_SITE_URL`
  (the HTTP-actions URL, e.g. `http://127.0.0.1:3211`); `convex/auth.config.ts` uses the same
  var, so issuance and validation match automatically. You do **not** need to set it manually.
- Verify the well-known routes serve after setting keys:
  `curl -s $VITE_CONVEX_SITE_URL/.well-known/jwks.json` (from `.env.local`).

## Step 2 — Seed a user and mint a session token

The email must pass the allowlist check in `beforeSessionCreation`. Easiest: make the demo
email an admin (also lets you open the admin allowlist page).

```bash
export CONVEX_AGENT_MODE=anonymous
EMAIL="demo@let-think.dev"; NAME="Demo User"
npx convex env set CONVEX_ADMIN_EMAILS -- "$EMAIL"
```

There is no committed "create user" function (by design — no auth backdoor in app code), so
drop in a **throwaway** internal mutation, use it, then delete it. The running `convex dev`
watcher auto-deploys/removes it.

```bash
cat > convex/devSeed.ts <<'TS'
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { normalizeEmail } from "./lib/access";

// TEMPORARY dev-only seed. Delete after use — do not commit.
export const createDemoUser = internalMutation({
  args: { email: v.string(), name: v.string() },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const existing = await ctx.db
      .query("users").withIndex("email", (q) => q.eq("email", email)).unique();
    const userId = existing?._id ?? (await ctx.db.insert("users", { email, name: args.name }));
    const allow = await ctx.db
      .query("betaAllowlist").withIndex("by_email", (q) => q.eq("email", email)).unique();
    if (!allow) await ctx.db.insert("betaAllowlist", { email, addedAt: Date.now() });
    return userId;
  },
});
TS

sleep 4  # let the watcher deploy it

USER_ID=$(npx convex run devSeed:createDemoUser "{\"email\":\"$EMAIL\",\"name\":\"$NAME\"}" | tr -d '"')
npx convex run auth:store "{\"args\":{\"type\":\"signIn\",\"userId\":\"$USER_ID\",\"generateTokens\":true}}"

rm convex/devSeed.ts   # clean up; watcher un-deploys it
```

`auth:store` prints `tokens.token` (JWT) and `tokens.refreshToken`. Copy both.

## Step 3 — Install the session in the browser

Convex Auth reads tokens from `localStorage`, namespaced by the client address
(`VITE_CONVEX_URL` with non-alphanumerics stripped). For `http://127.0.0.1:3210` the suffix is
`http1270013210`, giving keys `__convexAuthJWT_http1270013210` and
`__convexAuthRefreshToken_http1270013210`.

Print a ready-to-paste snippet (fills in the exact key names from `.env.local`):

```bash
node -e '
const url = require("fs").readFileSync(".env.local","utf8").match(/VITE_CONVEX_URL=(.*)/)[1].trim();
const ns = url.replace(/[^a-zA-Z0-9]/g,"");
const T="<PASTE_JWT>", R="<PASTE_REFRESH_TOKEN>";
console.log(`localStorage.setItem("__convexAuthJWT_${ns}", "${T}"); localStorage.setItem("__convexAuthRefreshToken_${ns}", "${R}"); location.href="/app";`);
'
```

Open `http://localhost:5173/`, paste the snippet into the DevTools Console, and run it. The app
loads the authenticated workspace at `/app`.

## Notes & limits

- The JWT lasts ~1h; the refresh token (~30 days) auto-renews it while the deployment keys stay
  set, so the session persists across reloads.
- **Chat/AI actions still fail** without `GOOGLE_GENERATIVE_AI_API_KEY` in the Convex env — this
  flow only unlocks the authenticated UI, not LLM calls.
- To reset: `npx convex run auth:store '{"args":{"type":"signOut"}}'` is per-session; simplest is
  to clear the two `localStorage` keys, or wipe the local backend.

## Alternative: real Google sign-in

Set `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `CONVEX_SITE_URL` in the Convex deployment, add
your email to the allowlist (or `CONVEX_ADMIN_EMAILS`), register the redirect URI in Google
Cloud, then click "Sign in with Google" in the app yourself.
