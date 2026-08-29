"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { generateText, type ModelMessage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { PROMPT_SUMMARY_INPUT_MAX_CHARS } from "./constants";
import { modelConfig } from "./modelConfig";

const THINKING_NOTES_CONTEXT_MAX_CHARS = PROMPT_SUMMARY_INPUT_MAX_CHARS * 8;

function truncateThinkingNotes(notes: string): string {
  const trimmed = notes.trim();
  if (trimmed.length <= THINKING_NOTES_CONTEXT_MAX_CHARS) return trimmed;
  return (
    trimmed.slice(0, THINKING_NOTES_CONTEXT_MAX_CHARS) +
    "\n\n[Note: content truncated for length.]"
  );
}

function buildNotesChatSystemPrompt(thinkingNotes: string): string {
  const notesBlock = truncateThinkingNotes(thinkingNotes);
  return `You are a thoughtful writing partner helping the user explore and refine their thinking notes.

The user's current notes (their working document) are below. Use them as primary context. Help them clarify ideas, spot gaps, suggest structure, and answer questions about what they wrote — without being preachy or mimicking a generic assistant voice.

When the notes are empty or minimal, help them get started based on what they ask.

--- Thinking notes ---
${notesBlock || "(empty)"}
--- End thinking notes ---`;
}

export const send = action({
  args: {
    sessionId: v.id("sessions"),
    userContent: v.string(),
    thinkingNotesSnapshot: v.string(),
  },
  handler: async (
    ctx,
    { sessionId, userContent, thinkingNotesSnapshot },
  ): Promise<{ content: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in");

    const session = await ctx.runQuery(internal.notesChat.internalLoadSession, {
      sessionId,
      userId,
    });
    if (!session) throw new Error("Session not found or access denied");

    const trimmed = userContent.trim();
    if (!trimmed) throw new Error("Message cannot be empty");

    const priorMessages = await ctx.runQuery(
      internal.notesChat.internalListMessages,
      { sessionId },
    );

    const modelMessages: ModelMessage[] = [
      ...priorMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: trimmed },
    ];

    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });

    const { text } = await generateText({
      model: google(modelConfig.mainContextGraphModel),
      system: buildNotesChatSystemPrompt(thinkingNotesSnapshot),
      messages: modelMessages,
    });

    const assistantContent =
      text.trim() || "I couldn't generate a response. Please try again.";

    await ctx.runMutation(internal.notesChat.addNotesChatMessages, {
      sessionId,
      userContent: trimmed,
      assistantContent,
    });

    return { content: assistantContent };
  },
});
