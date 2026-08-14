export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FitRect {
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

/** Centered source region that, scaled to dstW x dstH, covers it exactly. */
export function computeCropRect(srcW: number, srcH: number, dstW: number, dstH: number): Rect {
  const scale = Math.max(dstW / srcW, dstH / srcH);
  const cw = dstW / scale;
  const ch = dstH / scale;
  return {
    x: (srcW - cw) / 2,
    y: (srcH - ch) / 2,
    width: cw,
    height: ch,
  };
}

/** Destination rect that fits the whole source inside dstW x dstH, letterboxed. */
export function computeFitRect(srcW: number, srcH: number, dstW: number, dstH: number): FitRect {
  const scale = Math.min(dstW / srcW, dstH / srcH);
  const dw = srcW * scale;
  const dh = srcH * scale;
  return {
    dx: (dstW - dw) / 2,
    dy: (dstH - dh) / 2,
    dw,
    dh,
  };
}
