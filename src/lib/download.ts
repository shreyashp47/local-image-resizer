import { filenameForPreset, PRESETS } from "../presets";
import type { ProcessOptions } from "./types";

export function outputExt(format: ProcessOptions["format"]): string {
  return format === "image/png" ? "png" : format.split("/")[1];
}

export function downloadName(originalName: string, options: ProcessOptions, presetId?: string): string {
  if (presetId) {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (preset) return filenameForPreset(preset);
  }
  const base = originalName.replace(/\.[^.]+$/, "");
  return `${base}-${options.width}x${options.height}.${outputExt(options.format)}`;
}