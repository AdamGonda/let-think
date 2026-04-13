import { useRef } from "react";
import {
  useQuery,
  AuthLoading,
  Unauthenticated,
  Authenticated,
} from "convex/react";
import { api } from "../convex/_generated/api";
import { SessionDataProvider } from "./contexts/SessionDataContext";
import { AppUiProvider } from "./contexts/AppUiProvider";
import { useAppUiSelector } from "./hooks/useAppUi";
import { AppContentBody } from "./components/AppContentBody";
import { type SessionSidebarHandle } from "./components/SessionSidebar";
import { SignIn } from "./components/SignIn";
import { WorkPreferenceSync } from "./components/WorkPreferenceSync";
import { AppUiSessionBridge } from "./bridge/AppUiSessionBridge";
import { useSessionEditorSync } from "./hooks/useSessionEditorSync";
import { useDefaultSessionSelection } from "./hooks/useDefaultSessionSelection";

function App() {
  return (
    <>
      <AuthLoading>
        <div className="flex h-screen w-screen items-center justify-center bg-background">
          <span className="text-muted-foreground">Loading…</span>
        </div>
      </AuthLoading>
      <Unauthenticated>
        <SignIn />
      </Unauthenticated>
      <Authenticated>
        <AppUiProvider>
          <AppContent />
        </AppUiProvider>
      </Authenticated>
    </>
  );
}

function AppContent() {
  const activeSessionId = useAppUiSelector((s) => s.context.activeSessionId);
  const projectsWithSessions = useQuery(api.projects.listWithSessions);
  const { handleCreateSessionForFirstMessage } = useDefaultSessionSelection();
  useSessionEditorSync(activeSessionId);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const sessionSidebarRef = useRef<SessionSidebarHandle>(null);

  return (
    <>
      <WorkPreferenceSync />
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

export default App;
