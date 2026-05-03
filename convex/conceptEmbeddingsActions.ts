"use node";

import { createHash } from "node:crypto";
import { v } from "convex/values";
import { UMAP } from "umap-js";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

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

type ProjectionVectorRow = {
  embeddingId: Id<"conceptNodeEmbeddings">;
  sessionId: Id<"sessions">;
  userId: Id<"users">;
  nodeId: string;
  weaviateObjectId: string;
  vector: number[];
};

function tryExtractNumericVector(value: unknown, depth = 0): number[] | null {
  if (depth > 5) return null;
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === "number" && Number.isFinite(item))
  ) {
    return value;
  }
  if (!value || typeof value !== "object") return null;
  for (const nested of Object.values(value as Record<string, unknown>)) {
    const extracted = tryExtractNumericVector(nested, depth + 1);
    if (extracted) return extracted;
  }
  return null;
}

function parseOptionalPositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseOptionalPositiveNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

async function weaviateGetObjectVector(input: {
  weaviateUrl: string;
  weaviateApiKey: string | null;
  collection: string;
  objectId: string;
}): Promise<number[]> {
  const baseUrl = normalizeWeaviateUrl(input.weaviateUrl);
  const headers: Record<string, string> = {};
  if (input.weaviateApiKey) {
    headers.Authorization = `Bearer ${input.weaviateApiKey}`;
    headers["X-API-Key"] = input.weaviateApiKey;
  }
  const response = await fetch(
    `${baseUrl}/v1/objects/${encodeURIComponent(input.collection)}/${input.objectId}?include=vector,vectors`,
    {
      method: "GET",
      headers,
    }
  );
  if (!response.ok) {
    throw new Error(
      `Weaviate read failed for ${input.objectId}: ${response.status} ${response.statusText}`
    );
  }
  const data = (await response.json()) as {
    vector?: number[];
    vectors?: Record<string, unknown>;
    [key: string]: unknown;
  };
  if (Array.isArray(data.vector) && data.vector.length > 0) {
    return data.vector;
  }
  if (data.vectors && typeof data.vectors === "object") {
    for (const candidate of Object.values(data.vectors)) {
      if (
        Array.isArray(candidate) &&
        candidate.length > 0 &&
        candidate.every((item) => typeof item === "number" && Number.isFinite(item))
      ) {
        return candidate;
      }
      if (
        candidate &&
        typeof candidate === "object" &&
        Array.isArray(candidate.vector) &&
        candidate.vector.length > 0
      ) {
        return candidate.vector;
      }
    }
  }
  const extracted = tryExtractNumericVector(data);
  if (extracted) {
    return extracted;
  }
  console.warn("[concept-embeddings] projection.vector_shape_unexpected", {
    objectId: input.objectId,
    collection: input.collection,
    topLevelKeys: Object.keys(data),
    hasVector: Object.prototype.hasOwnProperty.call(data, "vector"),
    hasVectors: Object.prototype.hasOwnProperty.call(data, "vectors"),
  });
  throw new Error(`Weaviate object ${input.objectId} missing vector`);
}

async function weaviateListCollectionVectors(input: {
  weaviateUrl: string;
  weaviateApiKey: string | null;
  collection: string;
}): Promise<Map<string, number[]>> {
  const baseUrl = normalizeWeaviateUrl(input.weaviateUrl);
  const headers: Record<string, string> = {};
  if (input.weaviateApiKey) {
    headers.Authorization = `Bearer ${input.weaviateApiKey}`;
    headers["X-API-Key"] = input.weaviateApiKey;
  }

  const vectorsByObjectId = new Map<string, number[]>();
  const pageLimit = 200;
  let after: string | null = null;

  while (true) {
    const attemptParamSets: URLSearchParams[] = [
      new URLSearchParams({
        class: input.collection,
        include: "vector",
        limit: String(pageLimit),
      }),
      new URLSearchParams({
        include: "vector",
        limit: String(pageLimit),
      }),
      new URLSearchParams({
        limit: String(pageLimit),
      }),
    ];
    if (after) {
      for (const params of attemptParamSets) params.set("after", after);
    }

    let data: {
      objects?: Array<Record<string, unknown>>;
    } | null = null;
    let lastFailure:
      | {
          status: number;
          statusText: string;
          body: string;
          query: string;
        }
      | null = null;

    for (const params of attemptParamSets) {
      const query = params.toString();
      const response = await fetch(`${baseUrl}/v1/objects?${query}`, {
        method: "GET",
        headers,
      });
      if (response.ok) {
        data = (await response.json()) as {
          objects?: Array<Record<string, unknown>>;
        };
        break;
      }
      const body = truncateForLog(await response.text(), 500);
      lastFailure = {
        status: response.status,
        statusText: response.statusText,
        body,
        query,
      };
    }
    if (!data) {
      throw new Error(
        `Weaviate collection scan failed (${input.collection}): ${lastFailure?.status ?? 0} ${lastFailure?.statusText ?? "Unknown"} query=${lastFailure?.query ?? "n/a"} body=${lastFailure?.body ?? "n/a"}`
      );
    }

    const objects = Array.isArray(data.objects) ? data.objects : [];
    if (objects.length === 0) break;

    for (const obj of objects) {
      const objectClass =
        typeof obj.class === "string" && obj.class.length > 0 ? obj.class : null;
      if (objectClass && objectClass !== input.collection) continue;
      const objectId =
        typeof obj.id === "string" && obj.id.length > 0 ? obj.id : null;
      if (!objectId) continue;
      const vector = tryExtractNumericVector(obj);
      if (vector) {
        vectorsByObjectId.set(objectId, vector);
      }
    }

    const last = objects[objects.length - 1];
    const lastId = last && typeof last.id === "string" ? last.id : null;
    if (!lastId || objects.length < pageLimit) break;
    after = lastId;
  }

  return vectorsByObjectId;
}

export const processConceptNodeEmbeddings = internalAction({
  args: {
    sessionId: v.id("sessions"),
    userId: v.id("users"),
    batchId: v.string(),
    nodeIds: v.array(v.string()),
  },
  handler: async (ctx, { sessionId, userId, batchId, nodeIds }) => {
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
  },
});

export const projectAllVectorsTo3d = internalAction({
  args: {
    triggeredBy: v.id("users"),
  },
  returns: v.object({
    runId: v.id("globalVectorProjectionRuns"),
    processedCount: v.number(),
    successCount: v.number(),
    skippedCount: v.number(),
    failedCount: v.number(),
  }),
  handler: async (
    ctx,
    { triggeredBy }
  ): Promise<{
    runId: Id<"globalVectorProjectionRuns">;
    processedCount: number;
    successCount: number;
    skippedCount: number;
    failedCount: number;
  }> => {
    const weaviateUrl = process.env.WEAVIATE_URL;
    const weaviateApiKey = process.env.WEAVIATE_API_KEY ?? null;
    const weaviateCollection = process.env.WEAVIATE_COLLECTION ?? "ConceptNode";
    if (!weaviateUrl) {
      throw new Error("WEAVIATE_URL is required for global projection");
    }

    const projectionParams = {
      nComponents: 3,
      nNeighbors: parseOptionalPositiveInt(process.env.UMAP_N_NEIGHBORS, 15),
      minDist: parseOptionalPositiveNumber(process.env.UMAP_MIN_DIST, 0.1),
      spread: parseOptionalPositiveNumber(process.env.UMAP_SPREAD, 1),
      distanceFn: "euclidean",
    } as const;
    const runId: Id<"globalVectorProjectionRuns"> = await ctx.runMutation(
      internal.conceptEmbeddings.createGlobalProjectionRun,
      {
        triggeredBy,
        projectionParams,
      }
    );

    let processedCount = 0;
    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    try {
      const embeddings = await ctx.runQuery(
        internal.conceptEmbeddings.getAllSyncedEmbeddingsForProjection
      );
      processedCount = embeddings.length;
      const vectors: ProjectionVectorRow[] = [];
      const vectorsByObjectId = await weaviateListCollectionVectors({
        weaviateUrl,
        weaviateApiKey,
        collection: weaviateCollection,
      });

      for (const embedding of embeddings) {
        const vector = vectorsByObjectId.get(embedding.weaviateObjectId);
        if (vector && vector.length > 0) {
          vectors.push({
            ...embedding,
            embeddingId: embedding.embeddingId,
            sessionId: embedding.sessionId,
            userId: embedding.userId,
            nodeId: embedding.nodeId,
            weaviateObjectId: embedding.weaviateObjectId,
            vector,
          });
        } else {
          failedCount += 1;
          console.warn("[concept-embeddings] projection.vector_fetch_failed", {
            embeddingId: embedding.embeddingId,
            weaviateObjectId: embedding.weaviateObjectId,
            error: "Vector not found in scanned Weaviate collection",
          });
        }
      }

      if (vectors.length === 0) {
        skippedCount = processedCount;
        await ctx.runMutation(internal.conceptEmbeddings.replaceGlobalProjectionPoints, {
          projectionRunId: runId,
          projectionParams,
          points: [],
        });
        await ctx.runMutation(internal.conceptEmbeddings.completeGlobalProjectionRun, {
          runId,
          processedCount,
          successCount: 0,
          skippedCount,
          failedCount,
        });
        return {
          runId,
          processedCount,
          successCount: 0,
          skippedCount,
          failedCount,
        };
      }

      let coordinates: number[][];
      if (vectors.length < 3) {
        coordinates = vectors.map((_, index) => [index, 0, 0]);
      } else {
        const nNeighbors = Math.min(
          projectionParams.nNeighbors,
          Math.max(2, vectors.length - 1)
        );
        const umap = new UMAP({
          nComponents: 3,
          nNeighbors,
          minDist: projectionParams.minDist,
          spread: projectionParams.spread,
          distanceFn: euclideanDistance,
        });
        coordinates = umap.fit(vectors.map((row) => row.vector));
      }

      const points = vectors.map((row, index) => {
        const projected = coordinates[index] ?? [0, 0, 0];
        return {
          embeddingId: row.embeddingId,
          sessionId: row.sessionId,
          userId: row.userId,
          nodeId: row.nodeId,
          weaviateObjectId: row.weaviateObjectId,
          x: projected[0] ?? 0,
          y: projected[1] ?? 0,
          z: projected[2] ?? 0,
        };
      });

      await ctx.runMutation(internal.conceptEmbeddings.replaceGlobalProjectionPoints, {
        projectionRunId: runId,
        projectionParams,
        points,
      });

      successCount = points.length;
      skippedCount = processedCount - successCount - failedCount;
      await ctx.runMutation(internal.conceptEmbeddings.completeGlobalProjectionRun, {
        runId,
        processedCount,
        successCount,
        skippedCount,
        failedCount,
      });

      return {
        runId,
        processedCount,
        successCount,
        skippedCount,
        failedCount,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown projection failure";
      await ctx.runMutation(internal.conceptEmbeddings.failGlobalProjectionRun, {
        runId,
        processedCount,
        successCount,
        skippedCount,
        failedCount,
        errorMessage: message,
      });
      throw error;
    }
  },
});
