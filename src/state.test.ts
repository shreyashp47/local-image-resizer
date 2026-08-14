import { beforeEach, describe, expect, it } from "vitest";
import { saveSettings } from "./lib/settings";
import { buildProcessOptions, createAppState, createDefaultOptions, ASPECT_CHANGE_EVENT } from "./state";

beforeEach(() => {
  window.localStorage.clear();
});

describe("createAppState", () => {
  it("falls back to defaults when nothing is persisted", () => {
    const state = createAppState();
    expect(state.options).toEqual(createDefaultOptions());
    expect(state.aspectRatio).toBeUndefined();
    expect(state.file).toBeNull();
    expect(state.bitmap).toBeNull();
  });

  it("applies persisted settings", () => {
    saveSettings({ width: 1024, height: 1024, format: "image/png", quality: 90, mode: "crop", aspectRatio: 1 });
    const state = createAppState();
    expect(state.options).toMatchObject({ width: 1024, height: 1024, format: "image/png", mode: "crop" });
    expect(state.aspectRatio).toBe(1);
  });
});

describe("buildProcessOptions", () => {
  it("merges sourceRect in crop mode", () => {
    const state = createAppState();
    state.sourceRect = { x: 10, y: 20, width: 100, height: 100 };
    expect(buildProcessOptions(state).sourceRect).toEqual(state.sourceRect);
  });

  it("omits sourceRect when there is no active crop", () => {
    const state = createAppState();
    expect(buildProcessOptions(state).sourceRect).toBeUndefined();
  });

  it("ignores sourceRect outside crop mode", () => {
    const state = createAppState();
    state.options.mode = "fit";
    state.sourceRect = { x: 0, y: 0, width: 50, height: 50 };
    expect(buildProcessOptions(state).sourceRect).toBeUndefined();
  });

  it("does not mutate the stored options", () => {
    const state = createAppState();
    state.sourceRect = { x: 1, y: 2, width: 3, height: 4 };
    const built = buildProcessOptions(state);
    expect(built).not.toBe(state.options);
    expect(state.options.sourceRect).toBeUndefined();
  });
});

describe("ASPECT_CHANGE_EVENT", () => {
  it("is a stable event name", () => {
    expect(ASPECT_CHANGE_EVENT).toBe("lir:aspectchange");
  });
});