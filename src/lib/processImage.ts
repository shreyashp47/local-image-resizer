import { computeCropRect, computeFitRect, type Rect } from "./geometry";
import type { ProcessOptions, ProcessResult } from "./types";

export const MAX_SOURCE_PIXELS = 150_000_000;
export const MAX_OUTPUT_DIMENSION = 8192;

/**
 * Resize/process an image fully client-side.
 *
 * The output canvas is always opaque: JPEG/WebP/PNG for icon use never carry
 * alpha, so transparency is filled with white before export.
 *
 * Downscaling is done in ~2x steps through intermediate canvases to avoid the
 * aliasing/moiré you get from a single large jump.
 */
export async function processImage(
  source: CanvasImageSource & { width: number; height: number },
  options: ProcessOptions,
): Promise<ProcessResult> {
  const srcW = source.width;
  const srcH = source.height;
  const { width: dstW, height: dstH } = options;

  if (!isFinite(srcW) || !isFinite(srcH) || srcW <= 0 || srcH <= 0) {
    throw new Error("Invalid source image dimensions.");
  }
  if (dstW < 1 || dstH < 1 || dstW > MAX_OUTPUT_DIMENSION || dstH > MAX_OUTPUT_DIMENSION) {
    throw new Error(`Output dimensions must be between 1 and ${MAX_OUTPUT_DIMENSION} pixels.`);
  }
  if (srcW * srcH > MAX_SOURCE_PIXELS) {
    throw new Error("Image is too large to process (over 150 megapixels).");
  }

  const canvas = document.createElement("canvas");
  canvas.width = dstW;
  canvas.height = dstH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context is not available.");
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, dstW, dstH);

  const srcRect: Rect =
    options.mode === "crop"
      ? computeCropRect(srcW, srcH, dstW, dstH)
      : { x: 0, y: 0, width: srcW, height: srcH };

  if (options.mode === "fit") {
    const { dx, dy, dw, dh } = computeFitRect(srcW, srcH, dstW, dstH);
    drawWithHalving(ctx, source, srcRect, dx, dy, dw, dh);
  } else {
    drawWithHalving(ctx, source, srcRect, 0, 0, dstW, dstH);
  }

  const quality = options.quality ?? 90;
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Image export failed."))),
      options.format,
      options.format === "image/png" ? undefined : clampQuality(quality),
    );
  });

  return { blob, width: dstW, height: dstH };
}

function clampQuality(quality: number): number {
  if (!isFinite(quality)) return 0.9;
  return Math.min(1, Math.max(0, quality / 100));
}

/**
 * Draws `srcRect` from `source` into (dx, dy, dw, dh) on `ctx`, halving
 * through intermediate canvases when the source region is more than ~2x the
 * destination size.
 */
function drawWithHalving(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  srcRect: Rect,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  const maxStep = Math.max(srcRect.width / dw, srcRect.height / dh);

  if (maxStep <= 2) {
    ctx.drawImage(source, srcRect.x, srcRect.y, srcRect.width, srcRect.height, dx, dy, dw, dh);
    return;
  }

  let cur = document.createElement("canvas");
  cur.width = srcRect.width;
  cur.height = srcRect.height;
  const curCtx = cur.getContext("2d");
  if (!curCtx) throw new Error("Canvas 2D context is not available.");
  curCtx.imageSmoothingEnabled = true;
  curCtx.imageSmoothingQuality = "high";
  curCtx.drawImage(source, srcRect.x, srcRect.y, srcRect.width, srcRect.height, 0, 0, cur.width, cur.height);

  while (cur.width > dw * 2 || cur.height > dh * 2) {
    const nw = Math.max(dw, Math.ceil(cur.width / 2));
    const nh = Math.max(dh, Math.ceil(cur.height / 2));
    const next = document.createElement("canvas");
    next.width = nw;
    next.height = nh;
    const nctx = next.getContext("2d");
    if (!nctx) throw new Error("Canvas 2D context is not available.");
    nctx.imageSmoothingEnabled = true;
    nctx.imageSmoothingQuality = "high";
    nctx.drawImage(cur, 0, 0, nw, nh);
    cur = next;
  }

  ctx.drawImage(cur, 0, 0, cur.width, cur.height, dx, dy, dw, dh);
}
