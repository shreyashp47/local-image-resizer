import { describe, expect, it } from "vitest";
import { computeCropRect, computeFitRect } from "./geometry";

describe("computeCropRect", () => {
  it("returns the full source when aspect ratios match", () => {
    const rect = computeCropRect(1000, 500, 200, 100);
    expect(rect.x).toBeCloseTo(0);
    expect(rect.y).toBeCloseTo(0);
    expect(rect.width).toBeCloseTo(1000);
    expect(rect.height).toBeCloseTo(500);
  });

  it("crops horizontal bands from a taller-than-wide source", () => {
    // 1000x2000 -> 500x500: crop width 1000 (full), crop height 1000 centered
    const rect = computeCropRect(1000, 2000, 500, 500);
    expect(rect.x).toBeCloseTo(0);
    expect(rect.y).toBeCloseTo(500);
    expect(rect.width).toBeCloseTo(1000);
    expect(rect.height).toBeCloseTo(1000);
  });

  it("crops vertical bands from a wider-than-tall source", () => {
    // 2000x1000 -> 500x500: crop width 1000 centered, crop height 1000 (full)
    const rect = computeCropRect(2000, 1000, 500, 500);
    expect(rect.x).toBeCloseTo(500);
    expect(rect.y).toBeCloseTo(0);
    expect(rect.width).toBeCloseTo(1000);
    expect(rect.height).toBeCloseTo(1000);
  });

  it("always produces a region with exactly the destination aspect ratio", () => {
    for (const [sw, sh, dw, dh] of [
      [1240, 1268, 512, 512],
      [4000, 3000, 1200, 630],
      [333, 777, 1080, 1920],
      [1024, 768, 1, 1],
    ]) {
      const r = computeCropRect(sw, sh, dw, dh);
      expect(r.width).toBeCloseTo(r.height * (dw / dh), 6);
      expect(r.x + r.width).toBeLessThanOrEqual(sw + 1e-6);
      expect(r.y + r.height).toBeLessThanOrEqual(sh + 1e-6);
    }
  });
});

describe("computeFitRect", () => {
  it("letterboxes horizontally when source is taller", () => {
    const f = computeFitRect(500, 1000, 1000, 1000);
    expect(f.dw).toBeCloseTo(500);
    expect(f.dh).toBeCloseTo(1000);
    expect(f.dx).toBeCloseTo(250);
    expect(f.dy).toBeCloseTo(0);
  });

  it("letterboxes vertically when source is wider", () => {
    const f = computeFitRect(1000, 500, 1000, 1000);
    expect(f.dw).toBeCloseTo(1000);
    expect(f.dh).toBeCloseTo(500);
    expect(f.dx).toBeCloseTo(0);
    expect(f.dy).toBeCloseTo(250);
  });

  it("fills exactly when ratios match", () => {
    const f = computeFitRect(800, 600, 400, 300);
    expect(f.dw).toBeCloseTo(400);
    expect(f.dh).toBeCloseTo(300);
    expect(f.dx).toBeCloseTo(0);
    expect(f.dy).toBeCloseTo(0);
  });

  it("never exceeds the destination bounds", () => {
    for (const [sw, sh, dw, dh] of [
      [123, 456, 512, 512],
      [1920, 1080, 1080, 1080],
      [4000, 3000, 3840, 2160],
    ]) {
      const f = computeFitRect(sw, sh, dw, dh);
      expect(f.dw).toBeLessThanOrEqual(dw + 1e-6);
      expect(f.dh).toBeLessThanOrEqual(dh + 1e-6);
    }
  });
});
