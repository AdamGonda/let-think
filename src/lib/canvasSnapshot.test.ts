import { describe, expect, it } from "vitest";
import {
  getCanvasHasInk,
  setCanvasHasInk,
  snapshotCanvasJpeg,
  subscribeCanvasHasInk,
} from "./canvasSnapshot";

describe("canvasSnapshot registry", () => {
  it("notifies subscribers when ink appears", () => {
    setCanvasHasInk(false);
    let seen = false;
    const unsub = subscribeCanvasHasInk(() => {
      seen = getCanvasHasInk();
    });
    setCanvasHasInk(true);
    expect(seen).toBe(true);
    unsub();
    setCanvasHasInk(false);
  });

  it("returns null when no canvas is registered", async () => {
    expect(await snapshotCanvasJpeg()).toBeNull();
  });
});
