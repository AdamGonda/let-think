import { describe, expect, it } from "vitest";
import {
  getCanvasFrames,
  getCanvasHasInk,
  setCanvasFrames,
  setCanvasHasInk,
  snapshotCanvasJpeg,
  snapshotFrameJpeg,
  subscribeCanvasFrames,
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
    expect(await snapshotFrameJpeg("eyes")).toBeNull();
  });

  it("publishes frame list for mentions", () => {
    setCanvasFrames([]);
    let seen = 0;
    const unsub = subscribeCanvasFrames(() => {
      seen = getCanvasFrames().length;
    });
    setCanvasFrames([{ id: "1", name: "Eyes", slug: "eyes" }]);
    expect(seen).toBe(1);
    expect(getCanvasFrames()[0]?.slug).toBe("eyes");
    unsub();
    setCanvasFrames([]);
  });
});
