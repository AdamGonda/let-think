# Think - UX Feature Set Audit

## Product Snapshot

Think is a focused thinking workspace that combines chat, notes, and an evolving concept graph so users can develop ideas over time instead of losing context in linear threads. The experience is designed around session continuity, project organization, and fast context recovery.

## Feature Inventory by User Journey

### 1) Discover and access

- Public landing page communicates positioning, core benefits, and sign-in CTAs.
- Dedicated login route for unauthenticated users.
- Legal routes are available from the public shell.
- Root route gates authenticated users into the workspace and everyone else to landing.

Primary evidence: `src/pages/LandingPage.tsx`, `src/router.tsx`, `src/components/auth/SignIn.tsx`, `src/pages/TermsOfUsePage.tsx`, `src/pages/DataPolicyPage.tsx`.

### 2) Authenticate and manage account

- Google OAuth authentication through Convex Auth.
- Auth-aware loading and route redirection behavior.
- Account panel supports sign-out and tutorial replay.
- User identity is surfaced in the UI (name/email/avatar), with a visible free-plan label.

Primary evidence: `convex/auth.ts`, `convex/auth.config.ts`, `convex/http.ts`, `src/router.tsx`, `src/components/user/UserMenuPanel.tsx`, `src/components/user/UserCardExpanded.tsx`.

### 3) Organize work (projects and sessions)

- Create sessions and projects from sidebar actions.
- View and navigate sessions grouped by project (including inbox-style organization).
- Rename, move, and delete sessions/projects from workspace controls.
- Collapsible sidebar supports dense workspace navigation.
- Optional project notes list mode can be toggled once project-backed content exists.

Primary evidence: `src/components/session-sidebar/SessionSidebar.tsx`, `src/components/session-sidebar/SessionSidebarToolbar.tsx`, `src/components/session-sidebar/SessionSidebarProjectsNav.tsx`, `convex/projects.ts`, `convex/sessions.ts`.

### 4) Think in graph + chat flow

- Main interaction loop pairs chat with an evolving concept graph.
- Each assistant turn contributes a graph batch; users can step through prior batches.
- Users can reference numbered concepts in prompts using `@N`.
- Latest graph step remains the active continuation point for new input.
- Historical graph steps are protected with read-only prompt context to avoid accidental branch confusion.

Primary evidence: `src/components/app-shell/AppContentGraphSurface.tsx`, `src/components/chat/Chat.tsx`, `src/components/chat/ChatComposer.tsx`, `src/components/chat/HistoricalBatchPrompt.tsx`, `src/lib/conceptReferences.ts`, `convex/chat.ts`, `convex/chatPipeline.ts`.

### 5) Review and recover context

- Side history panel shows conversation timeline.
- Users can paginate older messages.
- History items can jump directly to matching graph steps.
- Topic-style summaries support faster scanning of earlier prompts.

Primary evidence: `src/components/chat/ChatHistoryPanel.tsx`, `src/contexts/SessionDataContext.tsx`, `convex/sessions.ts`, `convex/chat.ts`.

### 6) Capture notes while thinking

- Wake-up notes overlay enables private, in-flow note capture alongside a session.
- Notes and draft input are session-scoped and persisted.
- Markdown editing supports long-form thinking without leaving the workspace.
- Breadcrumbing helps users return from notes-list drilldowns to active context.

Primary evidence: `src/components/onboarding/WakeUpOverlay.tsx`, `src/components/editor/MarkdownEditor.tsx`, `src/hooks/useSessionEditorSync.ts`, `src/components/navigation/NoteBreadcrumb.tsx`, `convex/sessions.ts`.

### 7) Onboard and re-learn features

- First-time users get an automatic guided tutorial.
- Tutorial can be replayed from workspace controls.
- Onboarding explicitly teaches session/project creation, graph batches, `@` references, notes, and history navigation.

Primary evidence: `src/components/onboarding/Tutorial.tsx`, `src/lib/tutorialStorage.ts`, `README.md`.

## Notable UX Behavior Patterns

- **Auth-gated shell**: the app uses a clean public-to-private transition with loading fallback.
- **Progressive disclosure**: project notes toggle appears only when meaningful.
- **State continuity**: session-scoped draft, notes, messages, and concept graph are preserved.
- **History safety**: users can inspect older reasoning while input stays anchored to latest conversational state.

## Known Limitations and Caveats

- Legal pages are placeholder-grade and explicitly note need for production legal review.
- Pre-auth legacy records without `userId` remain in storage but are excluded from user-scoped queries.
- Some schema fields remain optional for backward compatibility, indicating transitional data handling.

Primary evidence: `src/pages/TermsOfUsePage.tsx`, `src/pages/DataPolicyPage.tsx`, `convex/migrations/README.md`, `convex/schema.ts`.