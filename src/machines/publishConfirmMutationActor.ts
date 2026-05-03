import { fromPromise } from "xstate";
import type { ConvexReactClient } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export type PublishConfirmMutationInput = {
  sessionId: Id<"sessions">;
  intent: "publish" | "unpublish";
};

export type PublishConfirmMutationOutput = {
  intent: "publish" | "unpublish";
};

/**
 * Convex-backed invoke actor for the publish / unpublish confirmation flow.
 * Injected via `appUiMachine.provide({ actors: { publishConfirmMutation: ... } })`
 * from `AppUiProvider` (needs an authenticated `ConvexReactClient`).
 */
export function createPublishConfirmMutationActor(convex: ConvexReactClient) {
  return fromPromise<PublishConfirmMutationOutput, PublishConfirmMutationInput>(
    async ({ input }) => {
      if (input.intent === "publish") {
        await convex.mutation(api.publishedSessions.publish, {
          sessionId: input.sessionId,
        });
      } else {
        await convex.mutation(api.publishedSessions.unpublish, {
          sessionId: input.sessionId,
        });
      }
      return { intent: input.intent };
    },
  );
}
