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

  /** Workspace artifact (Files list). One ideation `sessions` row per file. */
  files: defineTable({
    userId: v.optional(v.id("users")),
    projectId: v.optional(v.id("projects")),
    title: v.string(),
    thinkingNotes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_created", ["createdAt"])
    .index("by_project", ["projectId", "createdAt"])
    .index("by_user", ["userId", "createdAt"]),

  sessions: defineTable({
    userId: v.optional(v.id("users")),
    projectId: v.optional(v.id("projects")),
    fileId: v.optional(v.id("files")),
    title: v.string(),
    createdAt: v.number(),
    /** Graph composer draft */
    draftInput: v.optional(v.string()),
  })
    .index("by_created", ["createdAt"])
    .index("by_project", ["projectId", "createdAt"])
    .index("by_user", ["userId", "createdAt"])
    .index("by_file", ["fileId"]),

  /** Many chat threads per file. */
  chatSessions: defineTable({
    fileId: v.id("files"),
    userId: v.id("users"),
    title: v.string(),
    createdAt: v.number(),
    draftInput: v.optional(v.string()),
  })
    .index("by_file", ["fileId", "createdAt"])
    .index("by_user", ["userId", "createdAt"]),

  /** Concept graph per session — kept separate so listing sessions stays bandwidth-light. */
  sessionConceptGraphs: defineTable({
    sessionId: v.id("sessions"),
    graph: conceptGraphValue,
  }).index("by_session", ["sessionId"]),

  /** Embedding/sync state for concept nodes sent to vector DB. */
  conceptNodeEmbeddings: defineTable({
    sessionId: v.id("sessions"),
    userId: v.id("users"),
    nodeId: v.string(),
    nodeName: v.string(),
    nodeDescription: v.optional(v.string()),
    embeddingText: v.string(),
    contentHash: v.string(),
    embeddingModel: v.optional(v.string()),
    embeddingDimension: v.optional(v.number()),
    weaviateObjectId: v.optional(v.string()),
    syncStatus: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("success"),
      v.literal("failed")
    ),
    syncError: v.optional(v.string()),
    lastSyncedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_session_node", ["sessionId", "nodeId"])
    .index("by_session", ["sessionId"])
    .index("by_sync_status", ["syncStatus", "updatedAt"]),

  /** Rolling per-session centroid embedding sync state for vector DB. */
  sessionCentroidEmbeddings: defineTable({
    sessionId: v.id("sessions"),
    userId: v.id("users"),
    weaviateCollection: v.string(),
    weaviateObjectId: v.optional(v.string()),
    embeddingModel: v.optional(v.string()),
    embeddingDimension: v.optional(v.number()),
    sourceNodeCount: v.number(),
    syncStatus: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("success"),
      v.literal("failed")
    ),
    syncError: v.optional(v.string()),
    lastSyncedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_user", ["userId", "updatedAt"])
    .index("by_sync_status", ["syncStatus", "updatedAt"]),

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

  /** Chat-lane messages. Listed by `chatSessionId`; `sessionId` may exist on old rows. */
  chatMessages: defineTable({
    sessionId: v.optional(v.id("sessions")),
    chatSessionId: v.optional(v.id("chatSessions")),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    createdAt: v.number(),
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
  })
    .index("by_session", ["sessionId"])
    .index("by_chat_session", ["chatSessionId"]),
});
