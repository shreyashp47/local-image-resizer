import { describe, expect, it } from "vitest";
import {
  clampPan,
  constrainToAspect,
  coverScale,
  displayedSize,
  moveCrop,
  naturalToViewport,
  recenterOnZoom,
  resizeCrop,
  viewportToNatural,
} from "./cropGeometry";

describe("coverScale & displayedSize", () => {
  it("fills the viewport by scaling to max", () => {
    expect(coverScale(2000, 1000, 500, 500)).toBe(0.5);
    const d = displayedSize(2000, 1000, 0.5);
    expect(d).toEqual({ width: 1000, height: 500 });
  });
});

describe("clampPan", () => {
  it("allows any offset that keeps the image covering the viewport", () => {
    // image (800x600) is bigger than viewport (500x500); covers it at any
    // offset in [-300,0]x[-100,0]
    expect(clampPan(-500, -300, 800, 600, 500, 500)).toEqual({ x: -300, y: -100 });
    expect(clampPan(-100, -50, 800, 600, 500, 500)).toEqual({ x: -100, y: -50 });
    expect(clampPan(50, 50, 800, 600, 500, 500)).toEqual({ x: 0, y: 0 });
  });

  it("centers an exactly-covering image", () => {
    expect(clampPan(0, 0, 500, 500, 500, 500)).toEqual({ x: 0, y: 0 });
  });
});

describe("recenterOnZoom", () => {
  it("keeps the viewport-center image point stable across zoom", () => {
    // viewport is 500x500, so its center is at (250, 250)
    const oldW = 1000;
    const oldH = 800;
    const newW = 2000;
    const newH = 1600;
    const start = clampPan(-200, -100, oldW, oldH, 500, 500);
    const after = recenterOnZoom(start.x, start.y, oldW, oldH, newW, newH, 500, 500);
    expect(Math.abs((250 - after.x) / newW - (250 - start.x) / oldW)).toBeLessThan(0.01);
    expect(Math.abs((250 - after.y) / newH - (250 - start.y) / oldH)).toBeLessThan(0.01);
  });
});

describe("moveCrop", () => {
  it("moves within bounds", () => {
    const bounds = { x: 0, y: 0, width: 500, height: 500 };
    const moved = moveCrop({ x: 100, y: 100, width: 200, height: 200 }, 30, 40, bounds);
    expect(moved).toEqual({ x: 130, y: 140, width: 200, height: 200 });
  });

  it("clamps at the bounds edges", () => {
    const bounds = { x: 0, y: 0, width: 500, height: 500 };
    const moved = moveCrop({ x: 100, y: 100, width: 200, height: 200 }, 500, 500, bounds);
    expect(moved.x + moved.width).toBe(500);
    expect(moved.y + moved.height).toBe(500);
  });
});

describe("resizeCrop", () => {
  const bounds = { x: 0, y: 0, width: 500, height: 500 };

  it("grows from the south-east handle", () => {
    const r = resizeCrop({ x: 100, y: 100, width: 100, height: 100 }, "se", 50, 30, bounds);
    expect(r).toEqual({ x: 100, y: 100, width: 150, height: 130 });
  });

  it("grows from the north-west handle keeping the south-east corner fixed", () => {
    // dragging nw by (+50,+30) shrinks: the se corner (200,200) stays put
    const r = resizeCrop({ x: 100, y: 100, width: 100, height: 100 }, "nw", 50, 30, bounds);
    expect(r.x + r.width).toBe(200);
    expect(r.y + r.height).toBe(200);
    expect(r.width).toBe(50);
    expect(r.height).toBe(70);
  });

  it("grows from the north-west handle with negative deltas", () => {
    const r = resizeCrop({ x: 100, y: 100, width: 100, height: 100 }, "nw", -50, -30, bounds);
    expect(r.x).toBe(50);
    expect(r.y).toBe(70);
    expect(r.width).toBe(150);
    expect(r.height).toBe(130);
  });

  it("never shrinks below the minimum size", () => {
    const r = resizeCrop({ x: 100, y: 100, width: 100, height: 100 }, "nw", 200, 200, bounds, undefined, 24);
    expect(r.width).toBe(24);
    expect(r.height).toBe(24);
  });

  it("respects an aspect ratio when growing", () => {
    const r = resizeCrop({ x: 100, y: 100, width: 100, height: 100 }, "se", 50, 900, bounds, 1);
    expect(r.width).toBeCloseTo(r.height, 6);
  });

  it("respects an aspect ratio when growing from nw", () => {
    const r = resizeCrop({ x: 100, y: 100, width: 100, height: 100 }, "nw", -40, -40, bounds, 1);
    expect(Math.abs(r.width - r.height)).toBeLessThan(0.01);
  });
});

describe("constrainToAspect", () => {
  it("re-shapes a crop to the ratio, centered", () => {
    const bounds = { x: 0, y: 0, width: 500, height: 500 };
    const r = constrainToAspect({ x: 50, y: 50, width: 200, height: 200 }, 16 / 9, bounds);
    expect(r.width / r.height).toBeCloseTo(16 / 9, 6);
  });

  it("stays inside bounds", () => {
    const bounds = { x: 0, y: 0, width: 500, height: 500 };
    const r = constrainToAspect({ x: 0, y: 0, width: 490, height: 490 }, 0.4, bounds);
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.y).toBeGreaterThanOrEqual(0);
    expect(r.x + r.width).toBeLessThanOrEqual(500);
    expect(r.y + r.height).toBeLessThanOrEqual(500);
  });
});

describe("coordinate conversion", () => {
  it("converts viewport <-> natural coordinates round-trip", () => {
    const v = viewportToNatural(250, 250, -100, -50, 2);
    const back = naturalToViewport(v.x, v.y, -100, -50, 2);
    expect(back.x).toBeCloseTo(250, 6);
    expect(back.y).toBeCloseTo(250, 6);
  });
});