import { describe, expect, it } from "vitest";
import {
  appendAtReferenceToDraft,
  AT_REFERENCE_PATTERN,
  ensureSpaceAfterValidAtReferences,
  formatConceptPlainForClipboard,
  formatReferenceConceptBullets,
  formatReferenceTitleBullets,
  mirrorAtReferencePresence,
  selectedConceptTitlesFromDraft,
  removeAtReferencesFromDraft,
  setAtReferenceInDraft,
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

describe("setAtReferenceInDraft / mirrorAtReferencePresence", () => {
  it("appends when present is true and the ref is missing", () => {
    expect(setAtReferenceInDraft("hi", 2, true)).toBe("hi @2 ");
  });

  it("strips when present is false and the ref is there", () => {
    expect(setAtReferenceInDraft("x @2 y", 2, false)).toBe("x y");
  });

  it("is a no-op when presence already matches", () => {
    expect(setAtReferenceInDraft("@2 ", 2, true)).toBe("@2 ");
    expect(setAtReferenceInDraft("hello", 2, false)).toBe("hello");
  });

  it("mirrors source presence onto a separate chat draft", () => {
    expect(mirrorAtReferencePresence("@2 ", "notes here", 2)).toBe(
      "notes here @2 ",
    );
    expect(mirrorAtReferencePresence("go", "keep @2 this", 2)).toBe("keep this");
  });
});

describe("removeAtReferencesFromDraft", () => {
  it("strips consumed refs so graph cards unselect after a chat send", () => {
    expect(removeAtReferencesFromDraft("@1 @4 hello", [1, 4])).toBe("hello");
    expect(removeAtReferencesFromDraft("@1 leftover", [])).toBe("@1 leftover");
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

describe("formatConceptPlainForClipboard", () => {
  it("outputs title and description without refs or separators", () => {
    expect(
      formatConceptPlainForClipboard({
        name: "Alpha",
        description: "Details here.",
      }),
    ).toBe("Alpha\n\nDetails here.");
  });

  it("returns title only when no description", () => {
    expect(formatConceptPlainForClipboard({ name: "Beta" })).toBe("Beta");
  });
});

describe("formatReferenceConceptBullets", () => {
  it("formats selected concepts with optional descriptions", () => {
    expect(
      formatReferenceConceptBullets([
        { name: "One", description: "First concept description." },
        { name: "Two" },
      ]),
    ).toBe(
      "------\n- One\nFirst concept description.\n------\n- Two\n------",
    );
  });
});
