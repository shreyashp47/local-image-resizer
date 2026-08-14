import type { OutputFormat } from "./lib/types";

export interface Preset {
  id: string;
  category: "App icons" | "Social & video";
  label: string;
  width: number;
  height: number;
  format: OutputFormat;
}

export const PRESETS: Preset[] = [
  // App icons — PNG, no transparency
  { id: "app-store", category: "App icons", label: "Apple App Store", width: 1024, height: 1024, format: "image/png" },
  { id: "play-store", category: "App icons", label: "Google Play", width: 512, height: 512, format: "image/png" },
  { id: "ios-settings", category: "App icons", label: "iOS Settings", width: 180, height: 180, format: "image/png" },
  { id: "android-adaptive", category: "App icons", label: "Android adaptive", width: 432, height: 432, format: "image/png" },
  { id: "favicon", category: "App icons", label: "Favicon", width: 64, height: 64, format: "image/png" },
  // Social & video
  { id: "og-share", category: "Social & video", label: "OG / social share", width: 1200, height: 630, format: "image/jpeg" },
  { id: "ig-square", category: "Social & video", label: "Instagram square", width: 1080, height: 1080, format: "image/jpeg" },
  { id: "ig-portrait", category: "Social & video", label: "Instagram portrait", width: 1080, height: 1350, format: "image/jpeg" },
  { id: "ig-story", category: "Social & video", label: "Instagram story", width: 1080, height: 1920, format: "image/jpeg" },
  { id: "yt-thumb", category: "Social & video", label: "YouTube thumbnail", width: 1280, height: 720, format: "image/jpeg" },
  { id: "hd", category: "Social & video", label: "HD", width: 1920, height: 1080, format: "image/jpeg" },
  { id: "4k", category: "Social & video", label: "4K", width: 3840, height: 2160, format: "image/jpeg" },
];

export function filenameForPreset(preset: Preset): string {
  const ext = preset.format === "image/png" ? "png" : preset.format.split("/")[1];
  return `${preset.id}-${preset.width}x${preset.height}.${ext}`;
}
