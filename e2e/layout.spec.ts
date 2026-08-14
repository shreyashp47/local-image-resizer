import { expect, test } from "@playwright/test";
import { loadImageViaInput, makeImage } from "./helpers";

test("editor layout: settings right, actions bottom", async ({ page }) => {
  await page.goto("http://localhost:4173/");
  const img = await makeImage(page, 800, 600);
  await loadImageViaInput(page, img);
  await page.waitForSelector("#origBox img");
  await page.waitForTimeout(400);

  const boxes = await page.evaluate(() => {
    const r = (sel: string) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    };
    return {
      orig: r("#origBox"),
      out: r("#outBox"),
      settings: r("#settingsPanel"),
      actions: r(".action-bar"),
      download: r("#downloadBtn"),
      compare: r("#compareBtn"),
      reset: r("#resetBtn"),
    };
  });

  // settings to the right of the preview panels
  expect(boxes.settings!.x).toBeGreaterThanOrEqual(boxes.orig!.x + boxes.orig!.w);
  // action bar below the previews + settings
  expect(boxes.actions!.y).toBeGreaterThan(boxes.orig!.y + boxes.orig!.h);
  expect(boxes.actions!.y).toBeGreaterThan(boxes.settings!.y + boxes.settings!.h - 1);
  // three buttons in the bar
  expect(boxes.download!.y).toBeCloseTo(boxes.actions!.y, 0);
  expect(boxes.compare!.y).toBeCloseTo(boxes.actions!.y, 0);
  expect(boxes.reset!.y).toBeCloseTo(boxes.actions!.y, 0);
});