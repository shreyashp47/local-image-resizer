export type FitMode = "crop" | "fit" | "stretch";
export type OutputFormat = "image/jpeg" | "image/webp" | "image/png";

export interface ProcessOptions {
  width: number;
  height: number;
  mode: FitMode;
  format: OutputFormat;
  /** JPEG/WebP quality, 0-100. Ignored for PNG. */
  quality?: number;
}

export interface ProcessResult {
  blob: Blob;
  width: number;
  height: number;
}
