import { afterAll, describe, expect, it } from "vitest";
import type { Id } from "./_generated/dataModel";
import { makeNodeContentHash } from "./conceptEmbeddings";
import {
  computeCentroidVector,
  makeDeterministicSessionCentroidObjectId,
  scheduleSessionCentroidRecompute,
  makeDeterministicWeaviateObjectId,
} from "./conceptEmbeddingsActions";
import { isConceptEmbeddingsSyncEnabled } from "./featureFlags";

describe("makeNodeContentHash", () => {
  it("is stable for same node content", () => {
    const a = makeNodeContentHash({
      name: "Vector Search",
      description: "Store and retrieve semantic neighbors.",
    });
    const b = makeNodeContentHash({
      name: "Vector Search",
      description: "Store and retrieve semantic neighbors.",
    });
    expect(a).toBe(b);
  });

  it("changes when name or description changes", () => {
    const base = makeNodeContentHash({
      name: "Vector Search",
      description: "Store and retrieve semantic neighbors.",
    });
    const changedName = makeNodeContentHash({
      name: "Vector Retrieval",
      description: "Store and retrieve semantic neighbors.",
    });
    const changedDescription = makeNodeContentHash({
      name: "Vector Search",
      description: "Store semantic neighbors in Weaviate.",
    });
    expect(changedName).not.toBe(base);
    expect(changedDescription).not.toBe(base);
  });
});

describe("makeDeterministicWeaviateObjectId", () => {
  it("produces stable UUID-like ids", () => {
    const id = makeDeterministicWeaviateObjectId("session-1", "node-1");
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
    expect(makeDeterministicWeaviateObjectId("session-1", "node-1")).toBe(id);
  });

  it("changes when inputs differ", () => {
    const a = makeDeterministicWeaviateObjectId("session-1", "node-1");
    const b = makeDeterministicWeaviateObjectId("session-1", "node-2");
    expect(a).not.toBe(b);
  });
});

describe("makeDeterministicSessionCentroidObjectId", () => {
  it("produces stable UUID-like ids", () => {
    const id = makeDeterministicSessionCentroidObjectId("session-1");
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
    expect(makeDeterministicSessionCentroidObjectId("session-1")).toBe(id);
  });

  it("changes when session id differs", () => {
    const a = makeDeterministicSessionCentroidObjectId("session-1");
    const b = makeDeterministicSessionCentroidObjectId("session-2");
    expect(a).not.toBe(b);
  });
});

describe("computeCentroidVector", () => {
  it("computes arithmetic mean per dimension", () => {
    const centroid = computeCentroidVector([
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ]);
    expect(centroid).toEqual([4, 5, 6]);
  });

  it("throws for empty input", () => {
    expect(() => computeCentroidVector([])).toThrow(
      "Cannot compute centroid without source vectors"
    );
  });

  it("throws for mixed dimensions", () => {
    expect(() => computeCentroidVector([[1, 2], [3]])).toThrow(
      "Cannot compute centroid with mixed vector dimensions"
    );
  });
});

describe("scheduleSessionCentroidRecompute", () => {
  it("schedules centroid recompute with zero delay", async () => {
    const calls: Array<{ delayMs: number; fnRef: unknown; args: unknown }> = [];
    await scheduleSessionCentroidRecompute(
      {
        runAfter: async (delayMs, fnRef, args) => {
          calls.push({ delayMs, fnRef, args });
          return null;
        },
      },
      {
        sessionId: "session-1" as Id<"sessions">,
        userId: "user-1" as Id<"users">,
        batchId: "batch-1",
      }
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.delayMs).toBe(0);
    expect(calls[0]?.args).toEqual({
      sessionId: "session-1",
      userId: "user-1",
      batchId: "batch-1",
    });
  });
});

describe("isConceptEmbeddingsSyncEnabled", () => {
  const original = process.env.CONCEPT_EMBEDDINGS_SYNC_ENABLED;

  it("defaults to enabled when unset", () => {
    delete process.env.CONCEPT_EMBEDDINGS_SYNC_ENABLED;
    expect(isConceptEmbeddingsSyncEnabled()).toBe(true);
  });

  it("returns false for disabled values", () => {
    process.env.CONCEPT_EMBEDDINGS_SYNC_ENABLED = "false";
    expect(isConceptEmbeddingsSyncEnabled()).toBe(false);
    process.env.CONCEPT_EMBEDDINGS_SYNC_ENABLED = "0";
    expect(isConceptEmbeddingsSyncEnabled()).toBe(false);
  });

  it("returns true for truthy values", () => {
    process.env.CONCEPT_EMBEDDINGS_SYNC_ENABLED = "true";
    expect(isConceptEmbeddingsSyncEnabled()).toBe(true);
    process.env.CONCEPT_EMBEDDINGS_SYNC_ENABLED = "1";
    expect(isConceptEmbeddingsSyncEnabled()).toBe(true);
    process.env.CONCEPT_EMBEDDINGS_SYNC_ENABLED = "yes";
    expect(isConceptEmbeddingsSyncEnabled()).toBe(true);
  });

  afterAll(() => {
    process.env.CONCEPT_EMBEDDINGS_SYNC_ENABLED = original;
  });
});
