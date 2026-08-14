import { describe, expect, it } from "vitest";
import { PRESETS, filenameForPreset } from "./presets";

describe("presets", () => {
  it("has unique ids", () => {
    const ids = PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("app-icon presets are PNG", () => {
    for (const p of PRESETS.filter((p) => p.category === "App icons")) {
      expect(p.format).toBe("image/png");
    }
  });

  it("social/video presets are JPEG", () => {
    for (const p of PRESETS.filter((p) => p.category === "Social & video")) {
      expect(p.format).toBe("image/jpeg");
    }
  });

  it("app-store preset is 1024x1024", () => {
    const appStore = PRESETS.find((p) => p.id === "app-store");
    expect(appStore).toMatchObject({ width: 1024, height: 1024 });
  });

  it("4K preset is 3840x2160", () => {
    const ultra = PRESETS.find((p) => p.id === "4k");
    expect(ultra).toMatchObject({ width: 3840, height: 2160 });
  });

  it("generates expected filenames", () => {
    expect(filenameForPreset(PRESETS.find((p) => p.id === "app-store")!)).toBe(
      "app-store-1024x1024.png",
    );
    expect(filenameForPreset(PRESETS.find((p) => p.id === "ig-story")!)).toBe(
      "ig-story-1080x1920.jpeg",
    );
  });
});
