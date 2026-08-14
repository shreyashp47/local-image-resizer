import type { ProcessOptions } from "./types";

const KEY = "lir.settings.v1";

export interface PersistedSettings {
  width: number;
  height: number;
  format: ProcessOptions["format"];
  quality: number;
  mode: ProcessOptions["mode"];
  aspectRatio?: number;
}

export function loadSettings(): Partial<PersistedSettings> | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedSettings>;
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSettings(settings: PersistedSettings): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Private mode / quota exceeded — persistence is best-effort only.
  }
}

export function clearSettings(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
