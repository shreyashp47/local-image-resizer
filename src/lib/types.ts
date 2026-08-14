export type FitMode = "crop" | "fit" | "stretch";
export type OutputFormat = "image/jpeg" | "image/webp" | "image/png";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProcessOptions {
  width: number;
  height: number;
  mode: FitMode;
  format: OutputFormat;
  /** JPEG/WebP quality, 0-100. Ignored for PNG. */
  quality?: number;
  /**
   * Explicit source region (natural pixel coordinates). Used in "crop" mode
   * when an interactive crop box is active; defaults to center-crop.
   */
  sourceRect?: Rect;
}

export interface ProcessResult {
  blob: Blob;
  width: number;
  height: number;
}
