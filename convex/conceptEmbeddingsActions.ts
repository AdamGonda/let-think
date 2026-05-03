"use node";

import { createHash } from "node:crypto";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

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
