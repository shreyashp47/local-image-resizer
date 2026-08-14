import { mustGet, setStatus } from "./lib/dom";
import type { AppState } from "./app";
import { PRESETS, type Preset } from "./presets";
import type { OutputFormat } from "./lib/types";

export const FORMATS: Array<{ value: OutputFormat; label: string }> = [
  { value: "image/jpeg", label: "JPEG" },
  { value: "image/webp", label: "WebP" },
  { value: "image/png", label: "PNG (24-bit)" },
];

export const FIT_MODES: Array<{ value: AppState["options"]["mode"]; label: string; title: string }> = [
  { value: "crop", label: "Crop", title: "Center-crop to fill the exact output size" },
  { value: "fit", label: "Fit", title: "Fit the whole image, letterboxed on white" },
  { value: "stretch", label: "Stretch", title: "Scale to the exact output size (may distort)" },
];

export const ASPECT_RATIOS: Array<{ label: string; value?: number }> = [
  { label: "Free" },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:2", value: 3 / 2 },
  { label: "16:9", value: 16 / 9 },
  { label: "9:16", value: 9 / 16 },
];

export function initSettings(root: HTMLElement, state: AppState): void {
  const body = mustGet<HTMLElement>(root, "#settingsBody");
  const categories = [...new Set(PRESETS.map((p) => p.category))];
  body.innerHTML = `
    <label class="field">Presets
      ${categories
        .map(
          (cat) => `
        <div class="preset-group">
          <span class="preset-cat">${cat}</span>
          <div class="preset-row">
            ${PRESETS.filter((p) => p.category === cat)
              .map(
                (p) =>
                  `<button type="button" class="preset-chip" data-preset="${p.id}" title="${p.width} x ${p.height}">${p.label}</button>`,
              )
              .join("")}
          </div>
        </div>`,
        )
        .join("")}
    </label>
    <label class="field">Fit mode
      <div class="seg" id="fitModeSeg" role="group" aria-label="Fit mode">
        ${FIT_MODES.map(
          (m) =>
            `<button type="button" data-mode="${m.value}" title="${m.title}" class="${m.value === state.options.mode ? "active" : ""}">${m.label}</button>`,
        ).join("")}
      </div>
    </label>
    <label class="field">Aspect ratio lock
      <div class="seg" id="aspectSeg" role="group" aria-label="Aspect ratio lock">
        ${ASPECT_RATIOS.map(
          (a) =>
            `<button type="button" data-ratio="${a.value ?? "free"}">${a.label}</button>`,
        ).join("")}
      </div>
    </label>
    <div class="row">
      <label class="field">Width (px)
        <input type="number" id="width" value="${state.options.width}" min="1" max="8192" inputmode="numeric">
      </label>
      <label class="field">Height (px)
        <input type="number" id="height" value="${state.options.height}" min="1" max="8192" inputmode="numeric">
      </label>
    </div>
    <label class="field">Format
      <div class="seg" id="formatSeg" role="group" aria-label="Output format">
        ${FORMATS.map(
          (f) =>
            `<button type="button" data-format="${f.value}" class="${f.value === state.options.format ? "active" : ""}">${f.label}</button>`,
        ).join("")}
      </div>
    </label>
    <label class="field" id="qualityRow">Quality
      <input type="range" id="quality" min="10" max="100" value="${state.options.quality ?? 90}">
      <span id="qualityVal" style="color:var(--color-muted);font-weight:400;">${state.options.quality ?? 90}</span>
    </label>
    <div class="actions">
      <button type="button" class="btn-primary" id="downloadBtn" disabled>Download</button>
      <button type="button" class="btn-secondary" id="compareBtn" aria-pressed="false">Compare</button>
      <button type="button" class="btn-secondary" id="resetBtn">Choose another image</button>
    </div>
  `;

  const width = mustGet<HTMLInputElement>(body, "#width");
  const height = mustGet<HTMLInputElement>(body, "#height");
  const formatSeg = mustGet<HTMLElement>(body, "#formatSeg");
  const fitModeSeg = mustGet<HTMLElement>(body, "#fitModeSeg");
  const aspectSeg = mustGet<HTMLElement>(body, "#aspectSeg");
  const quality = mustGet<HTMLInputElement>(body, "#quality");
  const qualityVal = mustGet<HTMLElement>(body, "#qualityVal");
  const qualityRow = mustGet<HTMLElement>(body, "#qualityRow");
  const resetBtn = mustGet<HTMLButtonElement>(body, "#resetBtn");

  body.querySelectorAll<HTMLButtonElement>("button[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const preset = PRESETS.find((p) => p.id === btn.dataset.preset);
      if (!preset) return;
      applyPreset(preset);
    });
  });

  function applyPreset(preset: Preset): void {
    width.value = String(preset.width);
    height.value = String(preset.height);
    formatSeg.querySelectorAll("button").forEach((b) =>
      b.classList.toggle("active", b.dataset.format === preset.format),
    );
    state.options = { ...state.options, width: preset.width, height: preset.height, format: preset.format };
    state.presetId = preset.id;
    qualityRow.style.display = preset.format === "image/png" ? "none" : "block";
    state.scheduleRender();
    setStatus(root, `Preset applied: ${preset.label} (${preset.width} x ${preset.height})`);
  }

  const updateQualityRow = () => {
    qualityRow.style.display = state.options.format === "image/png" ? "none" : "block";
  };

  const updateOption = (patch: Partial<AppState["options"]>) => {
    state.options = { ...state.options, ...patch };
    state.scheduleRender();
  };

  const commitDim = (which: "width" | "height") => {
    const input = which === "width" ? width : height;
    const n = parseInt(input.value, 10);
    if (!isFinite(n) || n < 1) {
      input.value = String(state.options[which]);
      return;
    }
    if (n > 8192) {
      input.value = "8192";
      return;
    }
    if (which === "width") {
      updateOption({ width: n });
      if (state.aspectRatio) {
        const h = Math.round(n / state.aspectRatio);
        height.value = String(h);
        updateOption({ height: h });
      }
    } else {
      updateOption({ height: n });
      if (state.aspectRatio) {
        const w = Math.round(n * state.aspectRatio);
        width.value = String(w);
        updateOption({ width: w });
      }
    }
  };

  width.addEventListener("input", () => state.scheduleRender());
  width.addEventListener("change", () => commitDim("width"));
  height.addEventListener("input", () => state.scheduleRender());
  height.addEventListener("change", () => commitDim("height"));

  fitModeSeg.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-mode]");
    if (!btn) return;
    const mode = btn.dataset.mode as AppState["options"]["mode"];
    fitModeSeg.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
    updateOption({ mode });
  });

  aspectSeg.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-ratio]");
    if (!btn) return;
    const raw = btn.dataset.ratio;
    const match = ASPECT_RATIOS.find((a) => String(a.value ?? "free") === raw);
    state.aspectRatio = match?.value;
    aspectSeg.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
    if (state.aspectRatio) {
      const h = Math.round(parseInt(width.value, 10) / state.aspectRatio);
      height.value = String(h);
      updateOption({ height: h });
    }
  });

  formatSeg.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-format]");
    if (!btn) return;
    const format = btn.dataset.format as OutputFormat;
    formatSeg.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
    updateOption({ format });
    updateQualityRow();
  });

  quality.addEventListener("input", () => {
    qualityVal.textContent = quality.value;
    updateOption({ quality: parseInt(quality.value, 10) });
  });

  resetBtn.addEventListener("click", () => window.location.reload());

  updateQualityRow();
}
