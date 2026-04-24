import { useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SessionDataProvider } from "./contexts/SessionDataContext";
import { AppUiProvider } from "./contexts/AppUiProvider";
import { useAppUiSelector } from "./hooks/useAppUi";
import { AppContentBody } from "./components/app-shell/AppContentBody";
import { type SessionSidebarHandle } from "./components/session-sidebar/SessionSidebar";
import { useSessionAccentCssVars } from "./hooks/useSessionAccentCssVars";
import { AppUiSessionBridge } from "./bridge/AppUiSessionBridge";
import { useSessionEditorSync } from "./hooks/useSessionEditorSync";
import { useDefaultSessionSelection } from "./hooks/useDefaultSessionSelection";

/**
 * Authenticated workspace (routes, session UI). Public marketing and sign-in live
 * in TanStack Router (`src/router.tsx`).
 */
export function AuthenticatedApp() {
  return (
    <AppUiProvider>
      <AppContent />
    </AppUiProvider>
  );
}

function AppContent() {
  const activeSessionId = useAppUiSelector((s) => s.context.activeSessionId);
  const projectsWithSessions = useQuery(api.projects.listWithSessions);
  const { handleCreateSessionForFirstMessage } = useDefaultSessionSelection();
  useSessionEditorSync(activeSessionId);
  useSessionAccentCssVars();
  const mainContentRef = useRef<HTMLDivElement>(null);
  const sessionSidebarRef = useRef<SessionSidebarHandle>(null);

  return (
    <>
      <SessionDataProvider sessionId={activeSessionId}>
        <AppUiSessionBridge
          workspace={projectsWithSessions}
          activeSessionId={activeSessionId}
        >
          <AppContentBody
            onCreateSessionForFirstMessage={
              !activeSessionId ? handleCreateSessionForFirstMessage : undefined
            }
            workspace={projectsWithSessions}
            mainContentRef={mainContentRef}
            sessionSidebarRef={sessionSidebarRef}
          />
        </AppUiSessionBridge>
      </SessionDataProvider>
    </>
  );
}
