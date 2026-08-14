import { decodeImage, ImageDecodeError } from "./lib/decode";
import { mustGet, setStatus } from "./lib/dom";
import type { ProcessOptions, ProcessResult } from "./lib/types";
import { initRender } from "./render";
import { initSettings } from "./settings";

export interface AppState {
  file: File | null;
  bitmap: ImageBitmap | null;
  output: ProcessResult | null;
  options: ProcessOptions;
  renderToken: number;
  presetId?: string;
  scheduleRender: () => void;
  renderOutput: () => Promise<void>;
}

export function createDefaultOptions(): ProcessOptions {
  return { width: 512, height: 512, mode: "crop", format: "image/jpeg", quality: 90 };
}

export function initApp(): void {
  const root = document.querySelector<HTMLDivElement>("#app");
  if (!root) throw new Error("App root not found.");

  const state: AppState = {
    file: null,
    bitmap: null,
    output: null,
    options: createDefaultOptions(),
    renderToken: 0,
    scheduleRender: () => {},
    renderOutput: async () => {},
  };

  root.innerHTML = `
    <header class="app-header">
      <h1>Local Image Resizer</h1>
      <p>Resize images for app icons and social media — entirely in your browser.</p>
      <span class="privacy-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        100% offline — nothing is ever uploaded
      </span>
    </header>
    <main class="app-main">
      <section class="dropzone" id="dropzone" role="button" tabindex="0" aria-label="Choose or drop an image">
        <div class="dropzone-icon" aria-hidden="true">🖼️</div>
        <p>Drag &amp; drop an image here, or</p>
        <button type="button" class="dropzone-btn" id="pickBtn">Choose image</button>
        <input type="file" id="fileInput" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" hidden>
        <div class="dropzone-error" id="dropError" role="alert" aria-live="assertive" hidden></div>
      </section>

      <div class="workspace" id="workspace" hidden>
        <div class="grid-2">
          <section class="panel" aria-labelledby="origTitle">
            <h2 id="origTitle">Original</h2>
            <div class="preview-box" id="origBox"><img id="origPreview" alt="Original image"></div>
            <div class="preview-label" id="origMeta"></div>
          </section>
          <section class="panel" aria-labelledby="outTitle">
            <h2 id="outTitle">Output</h2>
            <div class="preview-box" id="outBox"></div>
            <div class="preview-label" id="outMeta"></div>
          </section>
        </div>
        <div class="panel" id="settingsPanel" style="margin-top:20px;" aria-labelledby="settingsTitle">
          <h2 id="settingsTitle">Settings</h2>
          <div id="settingsBody"></div>
        </div>
        <div class="status" id="status" role="status" aria-live="polite"></div>
      </div>
    </main>
    <footer class="app-footer">
      No server, no upload — processing happens locally. Built with the Canvas API.
    </footer>
  `;

  wireDropzone(root, state);
  initSettings(root, state);
  initRender(root, state);
  setStatus(root, "Choose an image to get started.");
}

function wireDropzone(root: HTMLElement, state: AppState): void {
  const dropzone = mustGet<HTMLElement>(root, "#dropzone");
  const fileInput = mustGet<HTMLInputElement>(root, "#fileInput");
  const dropError = mustGet<HTMLElement>(root, "#dropError");
  const pickBtn = mustGet<HTMLButtonElement>(root, "#pickBtn");

  const showError = (message: string) => {
    dropError.textContent = message;
    dropError.hidden = false;
  };

  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });
  pickBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  for (const evt of ["dragenter", "dragover"]) {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });
  }
  for (const evt of ["dragleave", "drop"]) {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
    });
  }
  dropzone.addEventListener("drop", (e) => {
    const file = e.dataTransfer?.files[0];
    if (file) void loadFile(file, state, root, showError);
  });
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (file) void loadFile(file, state, root, showError);
    fileInput.value = "";
  });
}

async function loadFile(
  file: File,
  state: AppState,
  root: HTMLElement,
  showError: (message: string) => void,
): Promise<void> {
  showError("");
  setStatus(root, "Decoding image…", "loading");
  try {
    const bitmap = await decodeImage(file);
    state.bitmap?.close();
    state.bitmap = bitmap;
    state.file = file;
    state.output = null;
    state.renderToken = 0;

    const workspace = mustGet<HTMLElement>(root, "#workspace");
    workspace.hidden = false;
    workspace.classList.add("visible");

    const preview = mustGet<HTMLImageElement>(root, "#origPreview");
    preview.src = URL.createObjectURL(file);
    preview.alt = file.name;

    const meta = mustGet<HTMLElement>(root, "#origMeta");
    meta.textContent = `${bitmap.width} x ${bitmap.height} px — ${file.name}`;

    const outBox = mustGet<HTMLElement>(root, "#outBox");
    outBox.innerHTML = "";
    mustGet<HTMLElement>(root, "#outMeta").textContent = "";
    mustGet<HTMLButtonElement>(root, "#downloadBtn").disabled = true;

    state.renderOutput();
  } catch (err) {
    if (err instanceof ImageDecodeError) {
      showError(err.message);
      setStatus(root, "");
    } else {
      showError("Something went wrong reading that file.");
      console.error(err);
    }
  }
}
