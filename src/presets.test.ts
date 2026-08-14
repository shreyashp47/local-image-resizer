import { describe, expect, it } from "vitest";
import { PRESETS, filenameForPreset } from "./presets";

describe("presets", () => {
  it("has unique ids", () => {
    const ids = PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("generates expected filenames for custom presets", () => {
    const custom: typeof PRESETS[0] = {
      id: "custom",
      category: "Custom",
      label: "Custom",
      width: 800,
      height: 600,
      format: "image/jpeg",
    };
    expect(filenameForPreset(custom)).toBe("custom-800x600.jpeg");
  });
});
