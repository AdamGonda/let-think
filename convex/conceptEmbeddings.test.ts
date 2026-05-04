import { afterAll, describe, expect, it } from "vitest";
import { makeNodeContentHash } from "./conceptEmbeddings";
import { makeDeterministicWeaviateObjectId } from "./conceptEmbeddingsActions";
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
