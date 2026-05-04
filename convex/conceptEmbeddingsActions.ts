"use node";

import { createHash } from "node:crypto";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalAction } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { isConceptEmbeddingsSyncEnabled } from "./featureFlags";

type WeaviateUpsertInput = {
  weaviateUrl: string;
  weaviateApiKey: string | null;
  collection: string;
  objectId: string;
  vector: number[];
  properties: Record<string, string | number>;
};

function truncateForLog(value: string, max = 300): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

function normalizeWeaviateUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function makeDeterministicWeaviateObjectId(
  sessionId: string,
  nodeId: string
): string {
  const hex = createHash("sha256")
    .update(`${sessionId}:${nodeId}`)
    .digest("hex")
    .slice(0, 32);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

export function makeDeterministicSessionCentroidObjectId(
  sessionId: string
): string {
  const hex = createHash("sha256")
    .update(`session-centroid:${sessionId}`)
    .digest("hex")
    .slice(0, 32);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

export function computeCentroidVector(vectors: number[][]): number[] {
  if (vectors.length === 0) {
    throw new Error("Cannot compute centroid without source vectors");
  }
  const dimension = vectors[0]?.length ?? 0;
  if (dimension === 0) {
    throw new Error("Cannot compute centroid for empty vectors");
  }
  for (const vector of vectors) {
    if (vector.length !== dimension) {
      throw new Error("Cannot compute centroid with mixed vector dimensions");
    }
  }
  const sums = new Array<number>(dimension).fill(0);
  for (const vector of vectors) {
    for (let i = 0; i < dimension; i += 1) {
      sums[i] += vector[i] ?? 0;
    }
  }
  return sums.map((sum) => sum / vectors.length);
}

async function embedTextWithGoogle(
  text: string,
  model: string,
  apiKey: string
): Promise<number[]> {
  console.info("[concept-embeddings] google.embed.start", {
    model,
    inputChars: text.length,
  });
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        content: {
          parts: [{ text }],
        },
        taskType: "RETRIEVAL_DOCUMENT",
      }),
    }
  );
  if (!response.ok) {
    const body = truncateForLog(await response.text());
    console.error("[concept-embeddings] google.embed.failed", {
      model,
      status: response.status,
      statusText: response.statusText,
      body,
    });
    throw new Error(
      `Google embedding request failed: ${response.status} ${response.statusText}`
    );
  }
  const data = (await response.json()) as {
    embedding?: { values?: number[] };
  };
  const values = data.embedding?.values;
  if (!values || values.length === 0) {
    throw new Error("Google embedding response missing vector values");
  }
  console.info("[concept-embeddings] google.embed.success", {
    model,
    dimension: values.length,
  });
  return values;
}

function resolveEmbeddingModelCandidates(configuredModel?: string): string[] {
  const fromEnv = (configuredModel ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter((m) => m.length > 0);
  const defaults = ["gemini-embedding-001", "text-embedding-004"];
  return Array.from(new Set([...fromEnv, ...defaults]));
}

async function weaviateUpsertObject(input: WeaviateUpsertInput): Promise<void> {
  const baseUrl = normalizeWeaviateUrl(input.weaviateUrl);
  console.info("[concept-embeddings] weaviate.upsert.start", {
    baseUrl,
    collection: input.collection,
    objectId: input.objectId,
    dimension: input.vector.length,
  });
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (input.weaviateApiKey) {
    headers.Authorization = `Bearer ${input.weaviateApiKey}`;
    headers["X-API-Key"] = input.weaviateApiKey;
  }
  const payload = {
    class: input.collection,
    id: input.objectId,
    vector: input.vector,
    properties: input.properties,
  };

  const createResponse = await fetch(`${baseUrl}/v1/objects`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (createResponse.ok) {
    console.info("[concept-embeddings] weaviate.create.success", {
      objectId: input.objectId,
      collection: input.collection,
    });
    return;
  }
  if (createResponse.status !== 422) {
    const body = truncateForLog(await createResponse.text());
    console.error("[concept-embeddings] weaviate.create.failed", {
      status: createResponse.status,
      statusText: createResponse.statusText,
      body,
      objectId: input.objectId,
      collection: input.collection,
    });
    throw new Error(
      `Weaviate create failed: ${createResponse.status} ${createResponse.statusText}`
    );
  }
  console.info("[concept-embeddings] weaviate.create.conflict.updating", {
    objectId: input.objectId,
    collection: input.collection,
  });

  const updateResponse = await fetch(`${baseUrl}/v1/objects/${input.objectId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });
  if (!updateResponse.ok) {
    const body = truncateForLog(await updateResponse.text());
    console.error("[concept-embeddings] weaviate.update.failed", {
      status: updateResponse.status,
      statusText: updateResponse.statusText,
      body,
      objectId: input.objectId,
      collection: input.collection,
    });
    throw new Error(
      `Weaviate update failed: ${updateResponse.status} ${updateResponse.statusText}`
    );
  }
  console.info("[concept-embeddings] weaviate.update.success", {
    objectId: input.objectId,
    collection: input.collection,
  });
}

async function fetchWeaviateVectorByObjectId(input: {
  weaviateUrl: string;
  weaviateApiKey: string | null;
  objectId: string;
}): Promise<number[]> {
  const baseUrl = normalizeWeaviateUrl(input.weaviateUrl);
  const headers: Record<string, string> = {};
  if (input.weaviateApiKey) {
    headers.Authorization = `Bearer ${input.weaviateApiKey}`;
    headers["X-API-Key"] = input.weaviateApiKey;
  }
  const response = await fetch(`${baseUrl}/v1/objects/${input.objectId}?include=vector`, {
    method: "GET",
    headers,
  });
  if (!response.ok) {
    const body = truncateForLog(await response.text());
    throw new Error(
      `Weaviate vector fetch failed for ${input.objectId}: ${response.status} ${response.statusText} ${body}`
    );
  }
  const data = (await response.json()) as { vector?: number[] };
  if (!Array.isArray(data.vector) || data.vector.length === 0) {
    throw new Error(`Weaviate vector missing for object ${input.objectId}`);
  }
  return data.vector;
}

export const fetchSessionCentroidVectors = action({
  args: {
    refs: v.array(
      v.object({
        sessionId: v.id("sessions"),
        sessionTitle: v.string(),
        projectId: v.optional(v.id("projects")),
        projectName: v.union(v.string(), v.null()),
        weaviateCollection: v.string(),
        weaviateObjectId: v.string(),
        embeddingModel: v.optional(v.string()),
        embeddingDimension: v.optional(v.number()),
        sourceNodeCount: v.number(),
        syncStatus: v.literal("success"),
        updatedAt: v.number(),
        lastSyncedAt: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, { refs }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be signed in");
    }
    const weaviateUrl = process.env.WEAVIATE_URL;
    const weaviateApiKey = process.env.WEAVIATE_API_KEY ?? null;
    if (!weaviateUrl) {
      throw new Error("WEAVIATE_URL is required for centroid vector reads");
    }
    return await Promise.all(
      refs.map(async (ref) => {
        const canAccessSession = await ctx.runQuery(
          internal.sessions.internalCanAccessSession,
          {
            sessionId: ref.sessionId,
            userId,
          }
        );
        if (!canAccessSession) return null;
        const vector = await fetchWeaviateVectorByObjectId({
          weaviateUrl,
          weaviateApiKey,
          objectId: ref.weaviateObjectId,
        });
        return {
          ...ref,
          vector,
        };
      })
    ).then((rows) => rows.filter((row) => row != null));
  },
});

export const processSessionCentroidEmbedding = internalAction({
  args: {
    sessionId: v.id("sessions"),
    userId: v.id("users"),
    batchId: v.string(),
  },
  handler: async (ctx, { sessionId, userId, batchId }) => {
    if (!isConceptEmbeddingsSyncEnabled()) {
      return;
    }
    const weaviateUrl = process.env.WEAVIATE_URL;
    const weaviateApiKey = process.env.WEAVIATE_API_KEY ?? null;
    const centroidCollection =
      process.env.WEAVIATE_SESSION_CENTROID_COLLECTION ?? "SessionCentroid";
    if (!weaviateUrl) {
      throw new Error("WEAVIATE_URL is required for centroid vector sync");
    }

    const successfulRows = await ctx.runQuery(
      internal.conceptEmbeddings.listSuccessfulEmbeddingsForSession,
      { sessionId, userId }
    );
    const centroidId = await ctx.runMutation(
      internal.conceptEmbeddings.upsertSessionCentroidPending,
      {
        sessionId,
        userId,
        weaviateCollection: centroidCollection,
        sourceNodeCount: successfulRows.length,
      }
    );
    await ctx.runMutation(internal.conceptEmbeddings.markSessionCentroidProcessing, {
      centroidId,
      sourceNodeCount: successfulRows.length,
    });

    try {
      if (successfulRows.length === 0) {
        throw new Error("No successful node embeddings available for centroid");
      }
      const model = successfulRows[0].embeddingModel;
      const dimension = successfulRows[0].embeddingDimension;
      if (!model || !dimension) {
        throw new Error("Missing embedding metadata for centroid source rows");
      }
      for (const row of successfulRows) {
        if (row.embeddingModel !== model) {
          throw new Error("Mixed embedding models found in session centroid source rows");
        }
        if (row.embeddingDimension !== dimension) {
          throw new Error(
            "Mixed embedding dimensions found in session centroid source rows"
          );
        }
      }

      const vectors = await Promise.all(
        successfulRows.map((row) => {
          const objectId = row.weaviateObjectId;
          if (!objectId) {
            throw new Error(`Missing Weaviate object id for node ${row.nodeId}`);
          }
          return fetchWeaviateVectorByObjectId({
            weaviateUrl,
            weaviateApiKey,
            objectId,
          });
        })
      );
      const centroidVector = computeCentroidVector(vectors);
      const centroidObjectId = makeDeterministicSessionCentroidObjectId(sessionId);

      await weaviateUpsertObject({
        weaviateUrl,
        weaviateApiKey,
        collection: centroidCollection,
        objectId: centroidObjectId,
        vector: centroidVector,
        properties: {
          sessionId,
          userId,
          batchId,
          sourceNodeCount: successfulRows.length,
          embeddingModel: model,
          embeddingDimension: dimension,
          updatedAt: Date.now(),
        },
      });

      await ctx.runMutation(internal.conceptEmbeddings.markSessionCentroidSuccess, {
        centroidId,
        weaviateObjectId: centroidObjectId,
        embeddingModel: model,
        embeddingDimension: dimension,
        sourceNodeCount: successfulRows.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown centroid sync error";
      await ctx.runMutation(internal.conceptEmbeddings.markSessionCentroidFailure, {
        centroidId,
        syncError: message,
        sourceNodeCount: successfulRows.length,
      });
    }
  },
});

export async function scheduleSessionCentroidRecompute(
  scheduler: {
    runAfter: (
      delayMs: number,
      fnRef: typeof internal.conceptEmbeddingsActions.processSessionCentroidEmbedding,
      args: { sessionId: Id<"sessions">; userId: Id<"users">; batchId: string }
    ) => Promise<unknown>;
  },
  args: { sessionId: Id<"sessions">; userId: Id<"users">; batchId: string }
): Promise<void> {
  await scheduler.runAfter(
    0,
    internal.conceptEmbeddingsActions.processSessionCentroidEmbedding,
    args
  );
}

export const processConceptNodeEmbeddings = internalAction({
  args: {
    sessionId: v.id("sessions"),
    userId: v.id("users"),
    batchId: v.string(),
    nodeIds: v.array(v.string()),
  },
  handler: async (ctx, { sessionId, userId, batchId, nodeIds }) => {
    if (!isConceptEmbeddingsSyncEnabled()) {
      console.info("[concept-embeddings] process.skipped.feature_flag_disabled", {
        sessionId,
        userId,
        batchId,
        requestedNodeCount: nodeIds.length,
      });
      return;
    }

    const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const weaviateUrl = process.env.WEAVIATE_URL;
    const weaviateCollection = process.env.WEAVIATE_COLLECTION ?? "ConceptNode";
    const weaviateApiKey = process.env.WEAVIATE_API_KEY ?? null;
    const embeddingModelConfig = process.env.GOOGLE_EMBEDDING_MODEL;
    const embeddingModelCandidates =
      resolveEmbeddingModelCandidates(embeddingModelConfig);

    if (!googleApiKey) {
      throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is required for embeddings");
    }
    if (!weaviateUrl) {
      throw new Error("WEAVIATE_URL is required for vector sync");
    }
    console.info("[concept-embeddings] process.start", {
      sessionId,
      userId,
      batchId,
      requestedNodeCount: nodeIds.length,
      weaviateUrl: normalizeWeaviateUrl(weaviateUrl),
      weaviateCollection,
      embeddingModelCandidates,
    });

    const rows = await ctx.runQuery(internal.conceptEmbeddings.getEmbeddingsForNodes, {
      sessionId,
      userId,
      nodeIds,
    });
    console.info("[concept-embeddings] process.rows.loaded", {
      sessionId,
      userId,
      batchId,
      loadedRowCount: rows.length,
    });

    for (const row of rows) {
      if (row.syncStatus === "success") {
        console.info("[concept-embeddings] process.skip.already_success", {
          embeddingId: row._id,
          nodeId: row.nodeId,
        });
        continue;
      }

      await ctx.runMutation(internal.conceptEmbeddings.markEmbeddingProcessing, {
        embeddingId: row._id,
      });
      try {
        console.info("[concept-embeddings] process.row.start", {
          embeddingId: row._id,
          nodeId: row.nodeId,
          syncStatus: row.syncStatus,
        });
        let vector: number[] | null = null;
        let modelUsed: string | null = null;
        let lastEmbeddingError: Error | null = null;
        for (const candidate of embeddingModelCandidates) {
          try {
            vector = await embedTextWithGoogle(row.embeddingText, candidate, googleApiKey);
            modelUsed = candidate;
            break;
          } catch (error) {
            lastEmbeddingError =
              error instanceof Error ? error : new Error("Unknown embedding error");
            console.warn("[concept-embeddings] google.embed.retry", {
              nodeId: row.nodeId,
              model: candidate,
              error: lastEmbeddingError.message,
            });
          }
        }
        if (!vector || !modelUsed) {
          throw (
            lastEmbeddingError ??
            new Error("Google embedding failed for all candidate models")
          );
        }
        const objectId = makeDeterministicWeaviateObjectId(
          row.sessionId,
          row.nodeId
        );
        await weaviateUpsertObject({
          weaviateUrl,
          weaviateApiKey,
          collection: weaviateCollection,
          objectId,
          vector,
          properties: {
            sessionId: row.sessionId,
            userId: row.userId,
            batchId,
            nodeId: row.nodeId,
            nodeName: row.nodeName,
            nodeDescription: row.nodeDescription ?? "",
            updatedAt: Date.now(),
          },
        });

        await ctx.runMutation(internal.conceptEmbeddings.markEmbeddingSuccess, {
          embeddingId: row._id,
          embeddingModel: modelUsed,
          embeddingDimension: vector.length,
          weaviateObjectId: objectId,
        });
        console.info("[concept-embeddings] process.row.success", {
          embeddingId: row._id,
          nodeId: row.nodeId,
          embeddingModel: modelUsed,
          weaviateObjectId: objectId,
          vectorDimension: vector.length,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown sync error";
        console.error("[concept-embeddings] process.row.failed", {
          embeddingId: row._id,
          nodeId: row.nodeId,
          error: message,
        });
        await ctx.runMutation(internal.conceptEmbeddings.markEmbeddingFailure, {
          embeddingId: row._id,
          syncError: message,
        });
      }
    }
    console.info("[concept-embeddings] process.done", {
      sessionId,
      userId,
      batchId,
    });
    await scheduleSessionCentroidRecompute(ctx.scheduler, {
      sessionId,
      userId,
      batchId,
    });
  },
});
