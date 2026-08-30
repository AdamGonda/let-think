import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SessionDataProvider } from "./contexts/SessionDataContext";
import { AppUiProvider } from "./contexts/AppUiProvider";
import { useAppUiSelector } from "./hooks/useAppUi";
import { AppContentBody } from "./components/app-shell/AppContentBody";
import { useSessionAccentCssVars } from "./hooks/useSessionAccentCssVars";
import { useMainColumnWidth } from "./hooks/useMainColumnWidth";
import { AppUiSessionBridge } from "./bridge/AppUiSessionBridge";
import { useSessionEditorSync } from "./hooks/useSessionEditorSync";
import { useDefaultSessionSelection } from "./hooks/useDefaultSessionSelection";
import { normalizeWorkspace } from "./lib/workspaceQueries";

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

function useEnsureFilesMigrated() {
  const ensureMigrated = useMutation(api.files.ensureMigrated);
  const [done, setDone] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        for (let i = 0; i < 40 && !cancelled; i++) {
          const result = await ensureMigrated({});
          if (result.done) break;
        }
      } finally {
        if (!cancelled) setDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ensureMigrated]);
  return done;
}

function AppContent() {
  const activeSessionId = useAppUiSelector((s) => s.context.activeSessionId);
  const activeFileId = useAppUiSelector((s) => s.context.activeFileId);
  const activeChatSessionId = useAppUiSelector(
    (s) => s.context.activeChatSessionId,
  );
  const projectsWithSessions = useQuery(api.projects.listWithSessions);
  const { handleCreateSessionForFirstMessage } = useDefaultSessionSelection();
  const filesMigrated = useEnsureFilesMigrated();
  useSessionEditorSync(activeSessionId, activeFileId, activeChatSessionId);
  useSessionAccentCssVars();
  const mainColumnWidth = useMainColumnWidth();
  const mainContentRef = useRef<HTMLDivElement>(null);

  const workspace = filesMigrated
    ? normalizeWorkspace(projectsWithSessions)
    : undefined;

  return (
    <>
      <SessionDataProvider
        sessionId={activeSessionId}
        chatSessionId={activeChatSessionId}
      >
        <AppUiSessionBridge
          workspace={workspace}
          activeSessionId={activeSessionId}
          activeFileId={activeFileId}
        >
          <AppContentBody
            onCreateSessionForFirstMessage={
              !activeSessionId ? handleCreateSessionForFirstMessage : undefined
            }
            workspace={workspace}
            mainContentRef={mainContentRef}
            mainColumnWidth={mainColumnWidth}
          />
        </AppUiSessionBridge>
      </SessionDataProvider>
    </>
  );
}
