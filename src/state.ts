import { loadSettings } from "./lib/settings";
import type { ProcessOptions, ProcessResult, Rect } from "./lib/types";

export const ASPECT_CHANGE_EVENT = "lir:aspectchange";

export interface AppState {
  file: File | null;
  bitmap: ImageBitmap | null;
  output: ProcessResult | null;
  options: ProcessOptions;
  renderToken: number;
  presetId?: string;
  aspectRatio?: number;
  /** Interactive crop region in natural pixel coordinates (crop viewport). */
  sourceRect?: Rect;
  scheduleRender: () => void;
  renderOutput: () => Promise<void>;
}

export function createDefaultOptions(): ProcessOptions {
  return { width: 512, height: 512, mode: "crop", format: "image/jpeg", quality: 90 };
}

export function createAppState(): AppState {
  const defaults = createDefaultOptions();
  const saved = loadSettings();
  return {
    file: null,
    bitmap: null,
    output: null,
    options: {
      width: saved?.width ?? defaults.width,
      height: saved?.height ?? defaults.height,
      mode: saved?.mode ?? defaults.mode,
      format: saved?.format ?? defaults.format,
      quality: saved?.quality ?? defaults.quality,
    },
    renderToken: 0,
    aspectRatio: saved?.aspectRatio,
    scheduleRender: () => {},
    renderOutput: async () => {},
  };
}

/**
 * Build the options sent to the processing pipeline. In crop mode an active
 * interactive crop region (state.sourceRect) overrides the default
 * center-crop; other modes ignore it.
 */
export function buildProcessOptions(state: AppState): ProcessOptions {
  return state.options.mode === "crop" && state.sourceRect
    ? { ...state.options, sourceRect: state.sourceRect }
    : state.options;
}
