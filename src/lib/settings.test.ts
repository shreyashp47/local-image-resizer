import { beforeEach, describe, expect, it } from "vitest";
import { loadSettings, saveSettings, clearSettings } from "./settings";

const KEY = "lir.settings.v1";

beforeEach(() => {
  window.localStorage.clear();
});

describe("settings persistence", () => {
  it("returns null when nothing is stored", () => {
    expect(loadSettings()).toBeNull();
  });

  it("round-trips saved settings", () => {
    saveSettings({ width: 1024, height: 1024, format: "image/png", quality: 90, mode: "crop" });
    const loaded = loadSettings();
    expect(loaded).toMatchObject({
      width: 1024,
      height: 1024,
      format: "image/png",
      quality: 90,
      mode: "crop",
    });
  });

  it("returns null for corrupted JSON instead of throwing", () => {
    window.localStorage.setItem(KEY, "{not json!!");
    expect(() => loadSettings()).not.toThrow();
    expect(loadSettings()).toBeNull();
  });

  it("returns null for non-object JSON", () => {
    window.localStorage.setItem(KEY, JSON.stringify(42));
    expect(loadSettings()).toBeNull();
  });

  it("clearSettings removes the entry", () => {
    saveSettings({ width: 512, height: 512, format: "image/jpeg", quality: 90, mode: "fit" });
    clearSettings();
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it("does not throw when storage is unavailable (private mode)", () => {
    const setItem = window.Storage.prototype.setItem;
    window.Storage.prototype.setItem = () => {
      throw new DOMException("QuotaExceededError");
    };
    try {
      expect(() =>
        saveSettings({ width: 512, height: 512, format: "image/jpeg", quality: 90, mode: "crop" }),
      ).not.toThrow();
    } finally {
      window.Storage.prototype.setItem = setItem;
    }
  });
});
