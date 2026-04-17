import { describe, expect, it } from "vitest";
import {
  appendAtReferenceToDraft,
  AT_REFERENCE_PATTERN,
  ensureSpaceAfterValidAtReferences,
  formatReferenceTitleBullets,
  selectedConceptTitlesFromDraft,
  toggleAtReferenceInDraft,
  type NumberedConcept,
} from "./conceptReferences";

const c1: NumberedConcept = { id: "n1", name: "One", number: 1 };
const c2: NumberedConcept = { id: "n2", name: "Two", number: 2 };

describe("AT_REFERENCE_PATTERN", () => {
  it("matches @n at word boundary", () => {
    expect("@1 ".match(new RegExp(AT_REFERENCE_PATTERN))).toBeTruthy();
    expect("@12 ".match(new RegExp(AT_REFERENCE_PATTERN))?.[1]).toBe("12");
  });
});

describe("appendAtReferenceToDraft / toggleAtReferenceInDraft", () => {
  it("appends with leading space when draft has text", () => {
    expect(appendAtReferenceToDraft("hi", 2)).toBe("hi @2 ");
  });

  it("toggles off existing reference", () => {
    expect(toggleAtReferenceInDraft("x @2 y", 2)).toBe("x y");
  });
});

describe("ensureSpaceAfterValidAtReferences", () => {
  it("inserts space after resolved @n at end of string (no following whitespace)", () => {
    expect(ensureSpaceAfterValidAtReferences("@1", [c1])).toBe("@1 ");
  });

  it("does not duplicate space", () => {
    expect(ensureSpaceAfterValidAtReferences("@1 x", [c1])).toBe("@1 x");
  });
});

describe("selectedConceptTitlesFromDraft", () => {
  it("returns selected concept titles in concept number order", () => {
    expect(selectedConceptTitlesFromDraft("@2 @1 @99", [c1, c2])).toEqual([
      "One",
      "Two",
    ]);
  });
});

describe("formatReferenceTitleBullets", () => {
  it("formats titles as markdown bullet lines", () => {
    expect(formatReferenceTitleBullets(["One", "Two"])).toBe("- One\n- Two");
  });
});
