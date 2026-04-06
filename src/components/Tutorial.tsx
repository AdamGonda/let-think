import { useEffect, useRef, useCallback } from "react";
import { timings } from "@/config";
import { driver, type Driver, type DriveStep, type Config } from "driver.js";
import "driver.js/dist/driver.css";
import {
  getTutorialCompleted,
  setTutorialCompleted,
} from "@/lib/tutorialStorage";

export { getTutorialCompleted, setTutorialCompleted } from "@/lib/tutorialStorage";

function getSteps(): DriveStep[] {
  return [
    {
      element: "[data-tour='main-content']",
      popover: {
        title: "Welcome to Think",
        description:
          "Think helps you work through ideas with an AI partner. Your thoughts become a visual concept graph, and you can reference concepts as you chat. Let's walk through the main features.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='new-session']",
      popover: {
        title: "New session",
        description:
          "Start a new thinking session. Each session builds a concept graph from your ideas. Click here whenever you want to begin fresh.",
        side: "right",
        align: "center",
      },
    },
    {
      element: "[data-tour='new-project']",
      popover: {
        title: "Projects",
        description:
          "Create projects to organize related sessions. Drag and drop sessions between projects. Double-click to rename.",
        side: "right",
        align: "center",
      },
    },
    {
      element: "[data-tour='notes-toggle']",
      popover: {
        title: "Project notes",
        description:
          "Switch to a list view of all your sessions and notes. Great for scanning and jumping between sessions.",
        side: "right",
        align: "center",
      },
    },
    {
      element: () =>
        document.querySelector("[data-tour='graph-area']") ??
        document.querySelector("[data-tour='main-content']")!,
      popover: {
        title: "Concept graph",
        description:
          "As you chat, the AI extracts concepts and builds a graph. Each step adds new nodes. Use the arrows above to move between steps and see how ideas evolved.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: () =>
        document.querySelector("[data-tour='session-input']") ??
        document.querySelector("[data-tour='main-content']")!,
      popover: {
        title: "Session input",
        description:
          "Type your thoughts here and press Enter to send. Use <strong>@1</strong>, <strong>@2</strong>, etc. to reference concepts from the latest step—this gives the AI context about what you're building on.",
        side: "top",
        align: "center",
      },
    },
    {
      element: () =>
        document.querySelector("[data-tour='notes-btn']") ??
        document.querySelector("[data-tour='main-content']")!,
      popover: {
        title: "Thinking notes",
        description:
          "While the AI thinks, you enter a focused \"Wake up\" mode to take notes. Your notes stay private and help you capture ideas as they form.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: () =>
        document.querySelector("[data-tour='history-btn']") ??
        document.querySelector("[data-tour='main-content']")!,
      popover: {
        title: "Conversation history",
        description:
          "Browse the full conversation and jump to any step in the concept graph. Useful for revisiting earlier parts of your thinking.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='main-content']",
      popover: {
        title: "You're ready!",
        description:
          "Create a session, type something, and watch your ideas take shape. You can always replay this tutorial from the sidebar.",
        side: "bottom",
        align: "center",
      },
    },
  ];
}

interface TutorialProps {
  /** Run the tutorial on mount (e.g. first-time users) */
  autoStart?: boolean;
  /** Called when tutorial is dismissed or completed */
  onComplete?: () => void;
}

export function Tutorial({ autoStart = false, onComplete }: TutorialProps) {
  const driverRef = useRef<Driver | null>(null);

  const runTutorial = useCallback(() => {
    if (driverRef.current?.isActive()) return;

    const steps = getSteps();
    const driverObj = driver({
      showProgress: true,
      progressText: "{{current}} of {{total}}",
      nextBtnText: "Next",
      prevBtnText: "Back",
      doneBtnText: "Get started",
      allowClose: true,
      overlayOpacity: 0.7,
      smoothScroll: true,
      animate: true,
      steps,
      onDestroyed: () => {
        setTutorialCompleted(true);
        driverRef.current = null;
        onComplete?.();
      },
    } as Config);

    driverRef.current = driverObj;
    driverObj.drive();
  }, [onComplete]);

  useEffect(() => {
    if (autoStart && !getTutorialCompleted()) {
      // Small delay so the UI is painted before the tour starts
      const t = setTimeout(runTutorial, timings.tutorialStartDelayMs);
      return () => clearTimeout(t);
    }
  }, [autoStart, runTutorial]);

  // Expose runTutorial for "Replay tutorial" - we need to do this via a different mechanism
  // since we can't easily expose it. We'll use a custom event or context.
  useEffect(() => {
    const handler = () => {
      setTutorialCompleted(false);
      runTutorial();
    };
    window.addEventListener("think:run-tutorial", handler);
    return () => window.removeEventListener("think:run-tutorial", handler);
  }, [runTutorial]);

  return null;
}

/** Call from anywhere to start or replay the tutorial */
export function runTutorial(): void {
  window.dispatchEvent(new Event("think:run-tutorial"));
}
