import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

/** Shared shape for concept graph (also stored in sessionConceptGraphs). */
const conceptGraphValue = v.object({
  nodes: v.array(
    v.object({
      id: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
    })
  ),
  edges: v.array(
    v.object({
      source: v.string(),
      target: v.string(),
    })
  ),
  batches: v.optional(
    v.array(
      v.object({
        id: v.string(),
        nodeIds: v.array(v.string()),
        promptSummary: v.optional(v.string()),
        description: v.optional(v.string()),
      })
    )
  ),
});

/**
 * Convex schema for projects, chat sessions, and messages.
 */
export default defineSchema({
  ...authTables,
  projects: defineTable({
    userId: v.optional(v.id("users")),
    name: v.string(),
    createdAt: v.number(),
  }).index("by_created", ["createdAt"]).index("by_user", ["userId", "createdAt"]),

  sessions: defineTable({
    userId: v.optional(v.id("users")),
    projectId: v.optional(v.id("projects")),
    title: v.string(),
    createdAt: v.number(),
    /** User's draft for next chat message, preserved across sessions */
    draftInput: v.optional(v.string()),
    /** Notes written during thinking/break period, separate from chat draft */
    thinkingNotes: v.optional(v.string()),
    /**
     * @deprecated Graphs live in `sessionConceptGraphs`. Kept optional for
     * one-shot migration; new data must not write here.
     */
    conceptGraph: v.optional(conceptGraphValue),
  }).index("by_created", ["createdAt"]).index("by_project", ["projectId", "createdAt"]).index("by_user", ["userId", "createdAt"]),

  /** Concept graph per session — kept separate so listing sessions stays bandwidth-light. */
  sessionConceptGraphs: defineTable({
    sessionId: v.id("sessions"),
    graph: conceptGraphValue,
  }).index("by_session", ["sessionId"]),

  messages: defineTable({
    sessionId: v.id("sessions"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    createdAt: v.number(),
    /** Short topic/summary for user messages – shown above bubble in history (max ~2 lines) */
    topic: v.optional(v.string()),
    /** Mention spans in content (user messages only) – for styling @ references in history */
    mentions: v.optional(
      v.array(
        v.object({
          start: v.number(),
          end: v.number(),
          conceptId: v.string(),
          name: v.string(),
        })
      )
    ),
  }).index("by_session", ["sessionId"]),

  /** Tracks interaction limits per chat session (limit, used, breakEndsAt). */
  interactionSessions: defineTable({
    sessionId: v.id("sessions"),
    userId: v.id("users"),
    limit: v.number(),
    used: v.number(),
    breakEndsAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_session", ["sessionId"]).index("by_user", ["userId"]),
});
