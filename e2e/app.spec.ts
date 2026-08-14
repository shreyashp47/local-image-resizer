import { expect, test } from "@playwright/test";
import {
  corruptFile,
  expectOutputVisible,
  getNaturalSize,
  jpegSignature,
  loadImageViaInput,
  makeImage,
  pngSignature,
  readDownload,
  zipSignature,
} from "./helpers";

test("load image -> output preview appears with correct size", async ({ page }) => {
  await page.goto("/");
  const img = await makeImage(page, 800, 600);
  await loadImageViaInput(page, img);

  await expectOutputVisible(page);
  await expect(page.locator("#origMeta")).toContainText("800 x 600");

  const out = await getNaturalSize(page, "#outBox img");
  expect(out).toEqual({ width: 512, height: 512 });
});

test("change to 512x512 JPEG q90 -> download is valid and under 1 MB", async ({ page }) => {
  await page.goto("/");
  const img = await makeImage(page, 2000, 2000);
  await loadImageViaInput(page, img);
  await expectOutputVisible(page);

  const downloadPromise = page.waitForEvent("download");
  await page.click("#downloadBtn");
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^resized-512x512\.jpe?g$/);

  const path = await download.path();
  expect(path).toBeTruthy();
  const buf = readDownload(path!);
  expect(jpegSignature(buf)).toBe(true);
  expect(buf.length).toBeLessThan(1024 * 1024);
});

test("fit mode switch changes the output (letterboxing)", async ({ page }) => {
  await page.goto("/");
  const img = await makeImage(page, 1600, 800); // 2:1, non-matching aspect
  await loadImageViaInput(page, img);
  await expectOutputVisible(page);

  const first = await page.locator("#outBox img").evaluate((el) => (el as HTMLImageElement).src);
  await page.click('button[data-mode="fit"]');
  // debounced render + worker round-trip: wait for the output to actually change
  await expect
    .poll(
      () => page.locator("#outBox img").evaluate((el) => (el as HTMLImageElement).src),
      { timeout: 15_000 },
    )
    .not.toBe(first);
  // fit output should still be exactly 512x512
  const out = await getNaturalSize(page, "#outBox img");
  expect(out).toEqual({ width: 512, height: 512 });
});

test("App Store preset sets 1024x1024 PNG", async ({ page }) => {
  await page.goto("/");
  const img = await makeImage(page, 1200, 1200);
  await loadImageViaInput(page, img);
  await expectOutputVisible(page);

  await page.click('button[data-preset="app-store"]');
  await expect(page.locator("#width")).toHaveValue("1024");
  await expect(page.locator("#height")).toHaveValue("1024");
  await expectOutputVisible(page);

  const downloadPromise = page.waitForEvent("download");
  await page.click("#downloadBtn");
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("app-store-1024x1024.png");

  const path = await download.path();
  const buf = readDownload(path!);
  expect(pngSignature(buf)).toBe(true);
  const size = await getNaturalSize(page, "#outBox img");
  expect(size).toEqual({ width: 1024, height: 1024 });
});

test("corrupt file drop shows an inline error, not a crash", async ({ page }) => {
  await page.goto("/");
  await page.setInputFiles("#fileInput", corruptFile());
  await expect(page.locator("#dropError")).toBeVisible();
  await expect(page.locator("#dropError")).toContainText("corrupt");
});

test("unsupported format shows a clear error", async ({ page }) => {
  await page.goto("/");
  await page.setInputFiles("#fileInput", {
    name: "doc.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 fake"),
  });
  await expect(page.locator("#dropError")).toBeVisible();
  await expect(page.locator("#dropError")).toContainText("Unsupported");
});

test("batch: 3 images -> queue of 3 -> ZIP downloads", async ({ page }) => {
  await page.goto("/");
  await page.click("#modeBatch");
  await expect(page.locator("#batchView")).toBeVisible();

  const files = await Promise.all([
    makeImage(page, 400, 400),
    makeImage(page, 500, 500),
    makeImage(page, 600, 600),
  ]);
  await page.setInputFiles("#batchInput", files);

  await expect(page.locator(".batch-item")).toHaveCount(3);
  await page.click("#batchProcessBtn");

  const downloadPromise = page.waitForEvent("download");
  await page.click("#batchZipBtn");
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("resized-images.zip");
  const path = await download.path();
  const buf = readDownload(path!);
  expect(zipSignature(buf)).toBe(true);
});

test("PWA: after first load the app still renders offline", async ({ page, context, browserName }) => {
  test.skip(
    browserName === "webkit",
    "WebKit offline-mode navigation is flaky in Playwright; SW caching is identical across engines.",
  );
  await page.goto("/");
  // activate + take control of the page (a reload online is required for the
  // SW to control the first page instance)
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.evaluate(async () => {
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true });
      });
    }
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("h1")).toHaveText("Local Image Resizer");
  await expect(page.locator("#dropzone")).toBeVisible();
});
