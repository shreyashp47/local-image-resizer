import { beforeEach, describe, expect, it } from "vitest";
import { downloadName, outputExt } from "./download";
import type { ProcessOptions } from "./types";

const options: ProcessOptions = { width: 512, height: 512, mode: "crop", format: "image/jpeg", quality: 90 };

beforeEach(() => {
  window.localStorage.clear();
});

describe("outputExt", () => {
  it("maps png to png", () => {
    expect(outputExt("image/png")).toBe("png");
  });

  it("maps jpeg/webp to their media subtype", () => {
    expect(outputExt("image/jpeg")).toBe("jpeg");
    expect(outputExt("image/webp")).toBe("webp");
  });
});

describe("downloadName", () => {
  it("uses the stripped original name with dimensions", () => {
    expect(downloadName("photo.png", options)).toBe("photo-512x512.jpeg");
  });

  it("handles names with multiple dots", () => {
    expect(downloadName("my.photo.2026.jpg", options)).toBe("my.photo.2026-512x512.jpeg");
  });

  it("prefers the preset filename when a preset id matches", () => {
    expect(downloadName("photo.png", options, "og-share")).toBe("og-share-1200x630.jpeg");
  });

  it("falls back to the plain name for unknown preset ids", () => {
    expect(downloadName("photo.png", options, "does-not-exist")).toBe("photo-512x512.jpeg");
  });
});