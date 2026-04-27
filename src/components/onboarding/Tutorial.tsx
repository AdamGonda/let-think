import { useEffect, useRef, useCallback } from "react";
import { timings } from "@/config";
import { driver, type Driver, type DriveStep, type Config } from "driver.js";
import "driver.js/dist/driver.css";
import {
  getTutorialCompleted,
  setTutorialCompleted,
} from "@/lib/tutorialStorage";

export { getTutorialCompleted, setTutorialCompleted } from "@/lib/tutorialStorage";

const FIRST_CONCEPT_CARD_SELECTOR = "[data-tour='concept-card-1']";
const FIRST_CONCEPT_REF_BUTTON_SELECTOR = "button[data-tour='concept-ref-btn-1']";
const FIRST_CONCEPT_COPY_BUTTON_SELECTOR = "button[data-tour='concept-copy-btn-1']";
const SESSION_TITLE_SELECTOR = "button[data-tour='session-title']";
const HISTORY_BUTTON_SELECTOR = "button[data-tour='history-btn']";
const SESSION_HISTORY_PANEL_SELECTOR = "[data-tour='session-history-panel-body']";
const GRAPH_STEP_INDEX = 1;

function getSteps(): DriveStep[] {
  return [
    {
      element: () =>
        document.querySelector("[data-tour='session-input']") ??
        document.querySelector("[data-tour='main-content']")!,
      popover: {
        title: "Try a prompt",
        description:
          "We'll prefill a test prompt for you: <strong>let's give me a good idea to think about</strong>.",
        side: "top",
        align: "center",
      },
    },
    {
      element: () =>
        document.querySelector("[data-tour='graph-area']") ??
        document.querySelector("[data-tour='main-content']")!,
      popover: {
        title: "Concept graph view",
        description:
          "This is your concept graph. As responses come in, ideas are added here so you can explore and connect them visually.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: () =>
        document.querySelector("[data-tour='concept-card-1']") ??
        document.querySelector("[data-tour='graph-area']") ??
        document.querySelector("[data-tour='main-content']")!,
      popover: {
        title: "Your idea cards",
        description:
          "These are your ideas. Each card has a title, and when you hover it you can see the description.",
        side: "top",
        align: "center",
      },
    },
    {
      element: () =>
        document.querySelector(FIRST_CONCEPT_REF_BUTTON_SELECTOR) ??
        document.querySelector("[data-tour='concept-card-1']") ??
        document.querySelector("[data-tour='graph-area']") ??
        document.querySelector("[data-tour='main-content']")!,
      popover: {
        title: "Reference button",
        description:
          "Use this number button to reference the idea in your prompt as <strong>@1</strong>. We'll click it now.",
        side: "left",
        align: "start",
      },
    },
    {
      element: () =>
        document.querySelector(FIRST_CONCEPT_COPY_BUTTON_SELECTOR) ??
        document.querySelector("[data-tour='concept-card-1']") ??
        document.querySelector("[data-tour='graph-area']") ??
        document.querySelector("[data-tour='main-content']")!,
      popover: {
        title: "Copy button",
        description:
          "Use this to copy the idea card to your clipboard so you can reuse it quickly.",
        side: "left",
        align: "end",
      },
    },
    {
      element: () =>
        document.querySelector(SESSION_TITLE_SELECTOR) ??
        document.querySelector("[data-tour='main-content']")!,
      popover: {
        title: "Session title",
        description:
          "This is the session title. Click it anytime to focus and reveal this session in the sidebar.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: () =>
        document.querySelector(HISTORY_BUTTON_SELECTOR) ??
        document.querySelector("[data-tour='main-content']")!,
      popover: {
        title: "Session history",
        description:
          "Use this button to open the session history panel and jump across earlier messages and steps.",
        side: "left",
        align: "start",
      },
    },
    {
      element: () =>
        document.querySelector(SESSION_HISTORY_PANEL_SELECTOR) ??
        document.querySelector("[data-tour='main-content']")!,
      popover: {
        title: "History panel",
        description:
          "This is the session history panel. You can review previous prompts and jump to earlier graph steps from here.",
        side: "left",
        align: "start",
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
  const autoActionStepIndexesRef = useRef<Set<number>>(new Set());
  const pendingAutoActionTimersRef = useRef<Set<number>>(new Set());
  const gateLoopRunningRef = useRef(false);

  const clearAutoActionTimers = useCallback(() => {
    for (const timerId of pendingAutoActionTimersRef.current) {
      window.clearTimeout(timerId);
    }
    pendingAutoActionTimersRef.current.clear();
  }, []);

  const setDriverNextDisabled = useCallback((disabled: boolean): boolean => {
    const nextButton = document.querySelector<HTMLButtonElement>(
      ".driver-popover-next-btn",
    );
    if (!nextButton) return false;
    nextButton.disabled = disabled;
    nextButton.setAttribute("aria-disabled", String(disabled));
    nextButton.style.opacity = disabled ? "0.5" : "";
    nextButton.style.pointerEvents = disabled ? "none" : "";
    return true;
  }, []);

  const gateStepTwoNextUntilCardsLoad = useCallback((activeIndex: number) => {
    if (activeIndex !== GRAPH_STEP_INDEX) {
      gateLoopRunningRef.current = false;
      setDriverNextDisabled(false);
      return;
    }
    if (gateLoopRunningRef.current) return;
    gateLoopRunningRef.current = true;

    const enforceGate = () => {
      if (!gateLoopRunningRef.current) return;
      const hasFirstCard = !!document.querySelector(FIRST_CONCEPT_CARD_SELECTOR);
      const shouldDisableNext = !hasFirstCard;
      setDriverNextDisabled(shouldDisableNext);
      if (!shouldDisableNext) {
        gateLoopRunningRef.current = false;
        return;
      }
      const timerId = window.setTimeout(() => {
        pendingAutoActionTimersRef.current.delete(timerId);
        enforceGate();
      }, 60);
      pendingAutoActionTimersRef.current.add(timerId);
    };

    // Run immediately and again on next frame to catch popover mount timing.
    enforceGate();
    const rafId = window.requestAnimationFrame(enforceGate);
    const timerId = window.setTimeout(() => {
      window.cancelAnimationFrame(rafId);
      pendingAutoActionTimersRef.current.delete(timerId);
    }, 80);
    pendingAutoActionTimersRef.current.add(timerId);
  }, [setDriverNextDisabled]);

  const runStepAutoAction = useCallback((stepIndex: number): boolean => {
    if (autoActionStepIndexesRef.current.has(stepIndex)) return true;
    switch (stepIndex) {
      case 0: {
        const input = document.querySelector<HTMLTextAreaElement>(
          "[data-session-input-textarea]",
        );
        if (!input) return false;

        const tutorialPrompt = "let's give me a good idea to think about";
        const setter = Object.getOwnPropertyDescriptor(
          HTMLTextAreaElement.prototype,
          "value",
        )?.set;
        setter?.call(input, tutorialPrompt);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.focus();
        autoActionStepIndexesRef.current.add(stepIndex);
        return true;
      }
      case 1: {
        const input = document.querySelector<HTMLTextAreaElement>(
          "[data-session-input-textarea]",
        );
        if (!input) return false;
        const form = input.form;
        if (!form) return false;
        form.requestSubmit();
        autoActionStepIndexesRef.current.add(stepIndex);
        return true;
      }
      case 2: {
        const card = document.querySelector<HTMLElement>(
          FIRST_CONCEPT_CARD_SELECTOR,
        );
        if (!card) return false;
        // React's onMouseEnter is synthesized from over/out; fire both pointer + mouse variants.
        card.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
        card.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
        card.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
        autoActionStepIndexesRef.current.add(stepIndex);
        return true;
      }
      case 3: {
        const refButton = document.querySelector<HTMLButtonElement>(
          FIRST_CONCEPT_REF_BUTTON_SELECTOR,
        );
        if (!refButton) return false;
        refButton.click();
        autoActionStepIndexesRef.current.add(stepIndex);
        return true;
      }
      case 4: {
        const copyButton = document.querySelector<HTMLButtonElement>(
          FIRST_CONCEPT_COPY_BUTTON_SELECTOR,
        );
        if (!copyButton) return false;
        copyButton.click();
        autoActionStepIndexesRef.current.add(stepIndex);
        return true;
      }
      case 5: {
        autoActionStepIndexesRef.current.add(stepIndex);
        return true;
      }
      case 6: {
        autoActionStepIndexesRef.current.add(stepIndex);
        return true;
      }
      case 7: {
        const historyButton = document.querySelector<HTMLButtonElement>(
          HISTORY_BUTTON_SELECTOR,
        );
        if (!historyButton) return false;
        historyButton.click();
        const panel = document.querySelector(SESSION_HISTORY_PANEL_SELECTOR);
        if (!panel) return false;
        driverRef.current?.refresh();
        autoActionStepIndexesRef.current.add(stepIndex);
        return true;
      }
      default:
        return true;
    }
  }, []);

  const runTutorial = useCallback(() => {
    if (driverRef.current?.isActive()) return;
    autoActionStepIndexesRef.current.clear();
    clearAutoActionTimers();

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
      onHighlightStarted: (_element, _step, { state }) => {
        const activeIndex = state.activeIndex;
        if (activeIndex == null || activeIndex < 0) return;
        gateStepTwoNextUntilCardsLoad(activeIndex);
        // Delay slightly so target elements finish layout changes before click/focus.
        const maxAttempts = activeIndex >= 2 ? 12 : 1;
        const runAttempt = (attempt: number) => {
          const success = runStepAutoAction(activeIndex);
          if (success || attempt >= maxAttempts) return;
          const retryTimerId = window.setTimeout(() => {
            pendingAutoActionTimersRef.current.delete(retryTimerId);
            runAttempt(attempt + 1);
          }, 250);
          pendingAutoActionTimersRef.current.add(retryTimerId);
        };
        const timerId = window.setTimeout(() => {
          pendingAutoActionTimersRef.current.delete(timerId);
          runAttempt(1);
        }, 140);
        pendingAutoActionTimersRef.current.add(timerId);
      },
      onDestroyed: () => {
        gateLoopRunningRef.current = false;
        setDriverNextDisabled(false);
        clearAutoActionTimers();
        autoActionStepIndexesRef.current.clear();
        setTutorialCompleted(true);
        driverRef.current = null;
        onComplete?.();
      },
    } as Config);

    driverRef.current = driverObj;
    driverObj.drive();
  }, [
    clearAutoActionTimers,
    gateStepTwoNextUntilCardsLoad,
    onComplete,
    runStepAutoAction,
    setDriverNextDisabled,
  ]);

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
    window.addEventListener("let-think:run-tutorial", handler);
    return () => {
      window.removeEventListener("let-think:run-tutorial", handler);
      clearAutoActionTimers();
    };
  }, [clearAutoActionTimers, runTutorial]);

  return null;
}

/** Call from anywhere to start or replay the tutorial */
export function runTutorial(): void {
  window.dispatchEvent(new Event("let-think:run-tutorial"));
}
