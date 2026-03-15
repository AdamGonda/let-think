import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Convex schema for chat sessions and messages.
 */
export default defineSchema({
  sessions: defineTable({
    title: v.string(),
    createdAt: v.number(),
    /** Concept graph: nodes (id, name) and edges (source, target) from preprocess prompt */
    conceptGraph: v.optional(
      v.object({
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
        /** Batches of nodes per LLM response – for UI traversal/highlighting */
        batches: v.optional(
          v.array(
            v.object({
              id: v.string(),
              nodeIds: v.array(v.string()),
            })
          )
        ),
      })
    ),
  }).index("by_created", ["createdAt"]),

  messages: defineTable({
    sessionId: v.id("sessions"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_session", ["sessionId"]),
});
