import { useEffect, useRef, useCallback } from "react";
import { timings } from "@/config";
import { driver, type Driver, type DriveStep, type Config } from "driver.js";
import "driver.js/dist/driver.css";
import {
  getTutorialCompleted,
  setTutorialCompleted,
} from "@/lib/tutorialStorage";

const FIRST_CONCEPT_CARD_SELECTOR = "[data-tour='concept-card-1']";
const FIRST_CONCEPT_REF_BUTTON_SELECTOR = "button[data-tour='concept-ref-btn-1']";
const NEW_SESSION_BUTTON_SELECTOR = "button[data-tour='new-session']";
const COLLAPSE_SIDEBAR_BUTTON_SELECTOR = "button[aria-label='Collapse sidebar']";
const GRAPH_STEP_INDEX = 1;
const TUTORIAL_PROMPT = "let's give me a good idea to think about";

function getSteps(): DriveStep[] {
  return [
    {
      element: () =>
        document.querySelector("[data-tour='session-input']") ??
        document.querySelector("[data-tour='main-content']")!,
      popover: {
        title: "Try a prompt",
        description: "We'll prefill a test prompt for you.",
        side: "top",
        align: "center",
      },
    },
    {
      element: () =>
        document.querySelector("[data-tour='graph-area']") ??
        document.querySelector("[data-tour='main-content']")!,
      popover: {
        title: "Ideas view",
        description:
          "These are the ideas the AI can communicate to you. As responses come in, ideas are added here so you can explore them visually.",
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
        title: "Idea cards",
        description:
          "Each card has a title, and when you hover it you can see the description.",
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
          "Use this number button to reference the idea in your prompt as <strong>@1</strong>.",
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
  const firstStepSessionStartedRef = useRef(false);
  const gateLoopRunningRef = useRef(false);

  const getSessionInput = useCallback((): HTMLTextAreaElement | null => {
    return (
      document.querySelector<HTMLTextAreaElement>(
        "textarea[data-session-input-textarea]",
      ) ??
      document.querySelector<HTMLTextAreaElement>(
        "[data-tour='session-input'] textarea",
      )
    );
  }, []);

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
        if (!firstStepSessionStartedRef.current) {
          const collapseSidebarButton = document.querySelector<HTMLButtonElement>(
            COLLAPSE_SIDEBAR_BUTTON_SELECTOR,
          );
          collapseSidebarButton?.click();

          const newSessionButton = document.querySelector<HTMLButtonElement>(
            NEW_SESSION_BUTTON_SELECTOR,
          );
          newSessionButton?.click();
          firstStepSessionStartedRef.current = true;
          // Let the new session mount its composer before attempting to type.
          return false;
        }

        const input = getSessionInput();
        if (!input) return false;
        if (input.disabled) return false;

        const setter = Object.getOwnPropertyDescriptor(
          HTMLTextAreaElement.prototype,
          "value",
        )?.set;
        setter?.call(input, TUTORIAL_PROMPT);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.focus();
        if (input.value !== TUTORIAL_PROMPT) return false;
        autoActionStepIndexesRef.current.add(stepIndex);
        return true;
      }
      case 1: {
        const input = getSessionInput();
        if (!input) return false;
        if (input.value.trim() !== TUTORIAL_PROMPT) return false;
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
      default:
        return true;
    }
  }, [getSessionInput]);

  const runTutorial = useCallback(() => {
    if (driverRef.current?.isActive()) return;
    autoActionStepIndexesRef.current.clear();
    firstStepSessionStartedRef.current = false;
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
        // Steps may depend on async UI updates (e.g. new session remount), so retry briefly.
        const maxAttempts = 12;
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
        firstStepSessionStartedRef.current = false;
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
