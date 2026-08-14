export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

/**
 * Base scale that fits the whole image inside the viewport (letterboxed).
 * The default view shows every pixel; zooming in beyond this fills the frame.
 */
export function fitScale(imgW: number, imgH: number, boxW: number, boxH: number): number {
  return Math.min(boxW / imgW, boxH / imgH);
}

/**
 * Base scale that fits the image to cover the viewport (fills it exactly in
 * at least one axis). Crop-frame coverage requires zoom >= 1.
 */
export function coverScale(imgW: number, imgH: number, boxW: number, boxH: number): number {
  return Math.max(boxW / imgW, boxH / imgH);
}

export function displayedSize(imgW: number, imgH: number, scale: number): { width: number; height: number } {
  return { width: imgW * scale, height: imgH * scale };
}

/**
 * Clamp the image's top-left offset. When the image is larger than the
 * viewport it must always cover it; when smaller it must stay fully visible
 * (letterboxed around the image).
 */
export function clampPan(ox: number, oy: number, dispW: number, dispH: number, boxW: number, boxH: number): Point {
  const minX = Math.min(boxW - dispW, 0);
  const maxX = Math.max(boxW - dispW, 0);
  const minY = Math.min(boxH - dispH, 0);
  const maxY = Math.max(boxH - dispH, 0);
  return {
    x: clamp(ox, minX, maxX),
    y: clamp(oy, minY, maxY),
  };
}

/** Keep the same image point under the viewport center when zoom changes. */
export function recenterOnZoom(
  ox: number,
  oy: number,
  oldW: number,
  oldH: number,
  newW: number,
  newH: number,
  boxW: number,
  boxH: number,
): Point {
  const cx = boxW / 2;
  const cy = boxH / 2;
  const t = oldW > 0 ? (cx - ox) / oldW : 0.5;
  const u = oldH > 0 ? (cy - oy) / oldH : 0.5;
  return clampPan(cx - newW * t, cy - newH * u, newW, newH, boxW, boxH);
}

/** Bounds a crop box must respect: inside the image's displayed coverage. */
export function imageBounds(ox: number, oy: number, dispW: number, dispH: number): Rect {
  return { x: ox, y: oy, width: dispW, height: dispH };
}

/** Move the crop box by (dx, dy), clamped to the given bounds. */
export function moveCrop(crop: Rect, dx: number, dy: number, bounds: Rect): Rect {
  const x = clamp(crop.x + dx, bounds.x, bounds.x + bounds.width - crop.width);
  const y = clamp(crop.y + dy, bounds.y, bounds.y + bounds.height - crop.height);
  return { x, y, width: crop.width, height: crop.height };
}

/**
 * Resize the crop box from one of its 8 handles by (dx, dy). Optionally
 * preserves an aspect ratio (anchored at the opposite corner).
 */
export function resizeCrop(
  crop: Rect,
  handle: Handle,
  dx: number,
  dy: number,
  bounds: Rect,
  aspect?: number,
  minSize = 24,
): Rect {
  let { x, y, width, height } = crop;

  const growX = handle === "e" || handle === "se" || handle === "ne";
  const growY = handle === "s" || handle === "se" || handle === "sw";
  const shrinkX = handle === "w" || handle === "nw" || handle === "sw";
  const shrinkY = handle === "n" || handle === "nw" || handle === "ne";

  if (growX) width += dx;
  if (growY) height += dy;
  if (shrinkX) {
    const newX = clamp(x + dx, bounds.x, x + width - minSize);
    width -= newX - x;
    x = newX;
  }
  if (shrinkY) {
    const newY = clamp(y + dy, bounds.y, y + height - minSize);
    height -= newY - y;
    y = newY;
  }

  // Clamp the far edges to the bounds.
  if (x + width > bounds.x + bounds.width) width = bounds.x + bounds.width - x;
  if (y + height > bounds.y + bounds.height) height = bounds.y + bounds.height - y;

  width = Math.max(minSize, width);
  height = Math.max(minSize, height);

  if (aspect) {
    // Anchor: the corner opposite the growing/shrinking edge.
    const ax = growX ? x : shrinkX ? x + width : x;
    const ay = growY ? y : shrinkY ? y + height : y;
    // Keep height driven by width (or width driven by height for narrow ratios).
    const newHeight = width / aspect;
    const newWidth = height * aspect;
    if (newHeight >= minSize) height = newHeight;
    else width = height * aspect;
    // Re-anchor so the opposite corner stays put.
    if (growX || shrinkX) {
      if (!shrinkX) x = ax;
      if (shrinkX) x = ax - width;
      if (!shrinkY) y = ay;
      if (shrinkY) y = ay - height;
    }
    void newWidth;
  }

  // Final clamp: never exceed the bounds.
  x = clamp(x, bounds.x, bounds.x + bounds.width - minSize);
  y = clamp(y, bounds.y, bounds.y + bounds.height - minSize);
  width = Math.min(width, bounds.x + bounds.width - x);
  height = Math.min(height, bounds.y + bounds.height - y);

  return { x, y, width, height };
}

/** Constrain an existing crop to the given aspect ratio, centered in place. */
export function constrainToAspect(crop: Rect, aspect: number, bounds: Rect): Rect {
  let { x, y, width, height } = crop;
  const candidate = width / aspect;
  if (candidate <= bounds.height) {
    height = candidate;
    y += (crop.height - height) / 2;
  } else {
    width = height * aspect;
    x += (crop.width - width) / 2;
  }
  x = clamp(x, bounds.x, bounds.x + bounds.width - width);
  y = clamp(y, bounds.y, bounds.y + bounds.height - height);
  return { x, y, width, height };
}

export function viewportToNatural(
  vx: number,
  vy: number,
  ox: number,
  oy: number,
  scale: number,
): Point {
  return { x: (vx - ox) / scale, y: (vy - oy) / scale };
}

export function naturalToViewport(
  nx: number,
  ny: number,
  ox: number,
  oy: number,
  scale: number,
): Point {
  return { x: nx * scale + ox, y: ny * scale + oy };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
