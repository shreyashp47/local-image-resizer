import { beforeEach, describe, expect, it, vi } from "vitest";
import { processImage } from "./processImage";
import type { ProcessOptions } from "./types";

function fakeSource(width: number, height: number) {
  return { width, height } as HTMLImageElement;
}

function baseOptions(overrides: Partial<ProcessOptions> = {}): ProcessOptions {
  return { width: 512, height: 512, mode: "crop", format: "image/jpeg", quality: 90, ...overrides };
}

describe("processImage", () => {
  let drawImage: ReturnType<typeof vi.spyOn>;
  let fillRect: ReturnType<typeof vi.spyOn>;
  let toBlob: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    drawImage = vi.spyOn(CanvasRenderingContext2D.prototype, "drawImage").mockImplementation(() => {});
    fillRect = vi.spyOn(CanvasRenderingContext2D.prototype, "fillRect").mockImplementation(() => {});
    toBlob = vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (
      this: HTMLCanvasElement,
      cb: BlobCallback | null,
    ) {
      cb?.(new Blob(["fake"], { type: "image/jpeg" }));
    });
  });

  it("produces an exact-size output with matching format", async () => {
    const result = await processImage(fakeSource(1000, 1000), baseOptions({ width: 250, height: 250 }));
    expect(result.width).toBe(250);
    expect(result.height).toBe(250);
    expect(result.blob.type).toBe("image/jpeg");
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), "image/jpeg", 0.9);
  });

  it("fills white before drawing (no alpha in icon output)", async () => {
    await processImage(fakeSource(100, 100), baseOptions());
    expect(fillRect).toHaveBeenCalledWith(0, 0, 512, 512);
    expect(drawImage).toHaveBeenCalled();
  });

  it("crop mode draws the center-cropped source region (wider source)", async () => {
    await processImage(fakeSource(2000, 1000), baseOptions({ width: 500, height: 500, mode: "crop" }));
    // 2000x1000 -> 500x500: source crop is 1000x1000 starting at x=500
    const call = drawImage.mock.calls.find((c) => c.length === 9);
    expect(call).toBeTruthy();
    if (call) {
      expect(call[1]).toBeCloseTo(500); // sx
      expect(call[2]).toBeCloseTo(0); // sy
      expect(call[3]).toBeCloseTo(1000); // sw
      expect(call[4]).toBeCloseTo(1000); // sh
      expect(call[5]).toBe(0); // dx
      expect(call[6]).toBe(0); // dy
      expect(call[7]).toBe(500); // dw
      expect(call[8]).toBe(500); // dh
    }
  });

  it("fit mode letterboxes (taller source drawn smaller)", async () => {
    await processImage(fakeSource(500, 1000), baseOptions({ width: 1000, height: 1000, mode: "fit" }));
    const call = drawImage.mock.calls.find((c) => c.length === 9);
    expect(call).toBeTruthy();
    if (call) {
      expect(call[7]).toBeCloseTo(500); // dw = 500
      expect(call[8]).toBeCloseTo(1000); // dh = 1000
      expect(call[5]).toBeCloseTo(250); // dx centered
    }
  });

  it("stretch mode draws the whole source into the exact destination", async () => {
    await processImage(fakeSource(100, 200), baseOptions({ width: 512, height: 512, mode: "stretch" }));
    const call = drawImage.mock.calls.find((c) => c.length === 9);
    expect(call).toBeTruthy();
    if (call) {
      expect(call[3]).toBe(100); // sw
      expect(call[4]).toBe(200); // sh
      expect(call[7]).toBe(512); // dw
      expect(call[8]).toBe(512); // dh
    }
  });

  it("PNG export passes undefined quality", async () => {
    await processImage(fakeSource(100, 100), baseOptions({ format: "image/png" }));
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), "image/png", undefined);
  });

  it("rejects invalid output dimensions", async () => {
    await expect(processImage(fakeSource(100, 100), baseOptions({ width: 0 }))).rejects.toThrow(
      "Output dimensions",
    );
    await expect(processImage(fakeSource(100, 100), baseOptions({ height: 100000 }))).rejects.toThrow(
      "Output dimensions",
    );
  });

  it("rejects oversized source images", async () => {
    await expect(
      processImage(fakeSource(20_000, 20_000), baseOptions()),
    ).rejects.toThrow("too large");
  });
});
