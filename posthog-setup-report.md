<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Let Think project (React + TanStack Router, code-based routing). Here is a summary of all changes made:

- **`posthog-js`** was already present in `package.json` (v1.372.3) — no new install needed.
- **`.env`** — added `VITE_PUBLIC_POSTHOG_PROJECT_TOKEN` and `VITE_PUBLIC_POSTHOG_HOST` environment variables.
- **`vite.config.ts`** — converted to function-form `defineConfig` and added a dev-server proxy (`/ingest`) routing PostHog traffic through the Vite server to `eu.i.posthog.com`, with separate `/ingest/static` and `/ingest/array` routes pointing to `eu-assets.i.posthog.com`.
- **`src/router.tsx`** — added `PostHogProvider` (from `posthog-js/react`) wrapping the root layout, with `capture_exceptions: true`, EU host, and `defaults: "2026-01-30"`.
- **`src/components/user/UserCard.tsx`** — added `posthog.identify()` call when the authenticated user's data first loads, passing Convex user ID as the distinct ID along with `name` and `email`.
- **`src/components/auth/SignIn.tsx`** — tracks `sign_in_clicked` with `{ provider: "google" }` when the sign-in button is clicked.
- **`src/components/user/UserMenuPanel.tsx`** — tracks `signed_out` and calls `posthog.reset()` when the user signs out.
- **`src/components/chat/Chat.tsx`** — tracks `message_sent` with `{ session_id, has_concept_references, concept_reference_count, is_new_session }` after a successful send; also calls `posthog.captureException()` on send errors.
- **`src/components/session-sidebar/useSessionSidebarWorkspace.ts`** — tracks `session_created`, `project_created`, `session_deleted`, `project_deleted`, `session_renamed`, and `session_moved_to_project` in their respective mutation callbacks.
- **`src/hooks/useAppContentBodyHandlers.ts`** — tracks `view_mode_changed` with `{ mode }` when the user toggles between graph and files view.
- **`src/components/app-shell/AppContentBody.tsx`** — tracks `editor_opened`, `concept_copied` (with `{ concept_name }`), and `chat_history_opened`.

## Events instrumented

| Event | Description | File |
|---|---|---|
| `sign_in_clicked` | User clicks the 'Sign in with Google' button | `src/components/auth/SignIn.tsx` |
| `signed_out` | User clicks 'Sign out' in the account menu | `src/components/user/UserMenuPanel.tsx` |
| `message_sent` | User submits a chat message | `src/components/chat/Chat.tsx` |
| `session_created` | New session created from the sidebar | `src/components/session-sidebar/useSessionSidebarWorkspace.ts` |
| `project_created` | New project created from the sidebar | `src/components/session-sidebar/useSessionSidebarWorkspace.ts` |
| `session_deleted` | Session confirmed deleted from the sidebar | `src/components/session-sidebar/useSessionSidebarWorkspace.ts` |
| `project_deleted` | Project confirmed deleted from the sidebar | `src/components/session-sidebar/useSessionSidebarWorkspace.ts` |
| `session_renamed` | Session title edited and saved | `src/components/session-sidebar/useSessionSidebarWorkspace.ts` |
| `session_moved_to_project` | Session drag-and-dropped to a project | `src/components/session-sidebar/useSessionSidebarWorkspace.ts` |
| `view_mode_changed` | User toggles between graph and files view | `src/hooks/useAppContentBodyHandlers.ts` |
| `concept_copied` | User copies a concept card to clipboard | `src/components/app-shell/AppContentBody.tsx` |
| `editor_opened` | User opens the notes editor overlay | `src/components/app-shell/AppContentBody.tsx` |
| `chat_history_opened` | User opens the chat history panel | `src/components/app-shell/AppContentBody.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://eu.posthog.com/project/168280/dashboard/648579
- **Sign-in to first message funnel**: https://eu.posthog.com/project/168280/insights/8NpCRYzh
- **Daily messages sent**: https://eu.posthog.com/project/168280/insights/9mltEPHe
- **New sessions and projects created**: https://eu.posthog.com/project/168280/insights/0wSjL5sg
- **Churn signal: sign-out rate**: https://eu.posthog.com/project/168280/insights/mO9DWHYM
- **Feature adoption: advanced features**: https://eu.posthog.com/project/168280/insights/h8DbhPD8

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
