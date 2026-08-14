import { expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

export function readDownload(path: string): Buffer {
  return readFileSync(path);
}

/**
 * Generate a fixture image entirely in the browser (no binary assets in repo)
 * and return it as a buffer Playwright can upload.
 */
export async function makeImage(page: Page, width: number, height: number): Promise<{
  name: string;
  mimeType: string;
  buffer: Buffer;
}> {
  const base64 = await page.evaluate(
    async ([w, h]) => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "#4f6ef7");
      grad.addColorStop(1, "#3b57d4");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#ffffff";
      ctx.font = `${Math.floor(h / 4)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(`${w}x${h}`, w / 2, h / 2);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("canvas.toBlob failed");
      const buf = new Uint8Array(await blob.arrayBuffer());
      let bin = "";
      for (const byte of buf) bin += String.fromCharCode(byte);
      return btoa(bin);
    },
    [width, height],
  );
  return {
    name: `fixture-${width}x${height}.png`,
    mimeType: "image/png",
    buffer: Buffer.from(base64, "base64"),
  };
}

export function corruptFile(): { name: string; mimeType: string; buffer: Buffer } {
  return {
    name: "corrupt.png",
    mimeType: "image/png",
    buffer: Buffer.from("this is definitely not a png image at all"),
  };
}

export function jpegSignature(buf: Buffer): boolean {
  return buf.length > 2 && buf[0] === 0xff && buf[1] === 0xd8;
}

export function pngSignature(buf: Buffer): boolean {
  return buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}

export function zipSignature(buf: Buffer): boolean {
  return buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b;
}

export async function loadImageViaInput(page: Page, file: { name: string; mimeType: string; buffer: Buffer }) {
  await page.setInputFiles("#fileInput", { name: file.name, mimeType: file.mimeType, buffer: file.buffer });
}

export async function expectOutputVisible(page: Page) {
  await expect(page.locator("#outBox img")).toBeVisible({ timeout: 15_000 });
}

export async function getNaturalSize(page: Page, imgSelector: string) {
  return page.locator(imgSelector).evaluate((img) => ({
    width: (img as HTMLImageElement).naturalWidth,
    height: (img as HTMLImageElement).naturalHeight,
  }));
}
