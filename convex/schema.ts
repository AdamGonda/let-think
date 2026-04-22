import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

/** Concept graph document shape for `sessionConceptGraphs.graph`. */
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
  betaAllowlist: defineTable({
    email: v.string(),
    addedAt: v.number(),
    addedBy: v.optional(v.id("users")),
  }).index("by_email", ["email"]),

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
    /** Present on some stored sessions (e.g. "open"); kept optional for backward compatibility */
    interactionRestriction: v.optional(v.string()),
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
});
