import type { OutputFormat } from "./lib/types";

export interface Preset {
  id: string;
  category: string;
  label: string;
  width: number;
  height: number;
  format: OutputFormat;
}

export const PRESETS: Preset[] = [
  // (presets removed)
];

export function filenameForPreset(preset: Preset): string {
  const ext = preset.format === "image/png" ? "png" : preset.format.split("/")[1];
  return `${preset.id}-${preset.width}x${preset.height}.${ext}`;
}
