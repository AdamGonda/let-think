import { useState } from "react";
import { layout } from "@/config";
import { Button } from "@/components/ui/button";
import { StepNavigator } from "@/components/StepNavigator";

/** Shown in Think (rest) mode when starting a session with no messages yet. */
export const REST_SESSION_WALKTHROUGH_STEPS = [
  "Breathing in.",
  'Saying: now I have this time to chill and wonder around.',
  "And get bored.",
] as const;

type RestSessionWalkthroughProps = {
  onComplete: () => void;
};

export function RestSessionWalkthrough({
  onComplete,
}: RestSessionWalkthroughProps) {
  const total = REST_SESSION_WALKTHROUGH_STEPS.length;
  const [index, setIndex] = useState(0);

  const isLast = index >= total - 1;
  const body = REST_SESSION_WALKTHROUGH_STEPS[index];

  return (
    <div
      className={`fixed inset-0 ${layout.restWalkthroughOverlayZIndexClass} flex items-center justify-center bg-background/95 p-6 backdrop-blur-sm`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rest-walkthrough-title"
      aria-describedby="rest-walkthrough-body"
    >
      <div className="flex w-full max-w-lg flex-col gap-8">
        <div className="text-center">
          <p
            id="rest-walkthrough-title"
            className="text-sm font-medium uppercase tracking-wide text-muted-foreground"
          >
            Settle into thinking
          </p>
          <p
            id="rest-walkthrough-body"
            className="mt-6 text-balance text-2xl font-light leading-relaxed text-foreground sm:text-3xl"
          >
            {body}
          </p>
        </div>
        <div className="flex flex-col items-center gap-4">
          <StepNavigator
            totalSteps={total}
            selectedIndex={index}
            onSelect={setIndex}
          />
          <div className="flex w-full max-w-xs flex-col gap-2 sm:flex-row sm:justify-center">
            {!isLast ? (
              <Button
                type="button"
                className="w-full sm:w-auto"
                onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
              >
                Next
              </Button>
            ) : (
              <Button
                type="button"
                className="w-full sm:w-auto"
                onClick={onComplete}
              >
                Continue
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
