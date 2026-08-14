import { decodeImage, ImageDecodeError } from "./lib/decode";
import { mustGet, setStatus } from "./lib/dom";
import type { AppState } from "./state";
import { createAppState } from "./state";
import { initBatch } from "./batch";
import { initCompare } from "./compare";
import { createCropViewport } from "./crop";
import { initRender } from "./render";
import { initSettings } from "./settings";

export function initApp(): void {
  const root = document.querySelector<HTMLDivElement>("#app");
  if (!root) throw new Error("App root not found.");

  const state = createAppState();

  root.innerHTML = `
    <a class="skip-link" href="#mainContent">Skip to content</a>
    <nav class="toolbar" aria-label="Site">
      <div class="toolbar-brand">
        <svg class="toolbar-seal" viewBox="0 0 512 512" aria-hidden="true">
          <circle cx="256" cy="256" r="206" fill="none" stroke="var(--color-accent)" stroke-width="5" stroke-dasharray="9 13"/>
          <g fill="none" stroke="currentColor" stroke-width="20" stroke-linecap="round" stroke-linejoin="round">
            <rect x="176" y="176" width="160" height="160" rx="26"/>
            <path d="M140 140 V118 H118 V140 Z"/>
            <path d="M372 140 H394 V118 H372 Z"/>
            <path d="M372 372 V394 H394 V372 Z"/>
            <path d="M140 372 H118 V394 H140 Z"/>
          </g>
        </svg>
        <span class="toolbar-title">Local Image Resizer</span>
      </div>
      <div class="toolbar-links">
        <a class="toolbar-link" href="/privacy">Privacy</a>
        <a class="toolbar-link" href="https://github.com/shreyashp47/local-image-resizer" target="_blank" rel="noopener">GitHub</a>
      </div>
    </nav>
    <header class="app-header">
      <div class="masthead">
        <svg class="masthead-seal" viewBox="0 0 512 512" aria-hidden="true">
          <circle cx="256" cy="256" r="248" fill="var(--color-ink)"/>
          <circle cx="256" cy="256" r="230" fill="var(--color-card)"/>
          <circle cx="256" cy="256" r="206" fill="none" stroke="var(--color-accent)" stroke-width="5" stroke-dasharray="9 13"/>
          <circle cx="256" cy="256" r="180" fill="none" stroke="var(--color-accent)" stroke-width="3" opacity="0.8"/>
          <g fill="none" stroke="var(--color-text)" stroke-width="20" stroke-linecap="round" stroke-linejoin="round">
            <rect x="176" y="176" width="160" height="160" rx="26"/>
            <path d="M140 140 V118 H118 V140 Z"/>
            <path d="M372 140 H394 V118 H372 Z"/>
            <path d="M372 372 V394 H394 V372 Z"/>
            <path d="M140 372 H118 V394 H140 Z"/>
          </g>
        </svg>
        <div class="masthead-text">
          <h1>Local Image Resizer</h1>
          <p>Resize images for app icons and social media — entirely in your browser.</p>
        </div>
      </div>
      <span class="privacy-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        100% offline — nothing is ever uploaded
      </span>
    </header>
    <main class="app-main" id="mainContent">
      <div class="mode-switch" role="group" aria-label="Mode">
        <button type="button" id="modeSingle" class="active" aria-pressed="true">Single image</button>
        <button type="button" id="modeBatch" aria-pressed="false">Batch</button>
      </div>

      <section id="singleView">
        <div class="dropzone" id="dropzone" role="button" tabindex="0" aria-label="Choose or drop an image">
          <div class="dropzone-icon" aria-hidden="true">🖼️</div>
          <p>Drag &amp; drop an image here, or</p>
          <button type="button" class="dropzone-btn" id="pickBtn">Choose image</button>
          <input type="file" id="fileInput" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" hidden>
          <div class="dropzone-error" id="dropError" role="alert" aria-live="assertive" hidden></div>
        </div>

        <div class="workspace" id="workspace" hidden>
          <div class="editor-grid">
            <div class="grid-2">
              <section class="panel" aria-labelledby="origTitle">
                <div class="panel-head">
                  <h2 id="origTitle">Original</h2>
                  <span class="panel-badge">Crop &amp; zoom</span>
                </div>
                <div class="preview-box" id="origBox"></div>
                <div class="preview-label" id="origMeta"></div>
              </section>
              <section class="panel" aria-labelledby="outTitle">
                <div class="panel-head">
                  <h2 id="outTitle">Output</h2>
                  <span class="panel-badge">Live preview</span>
                </div>
                <div class="preview-box" id="outBox"></div>
                <div class="preview-label" id="outMeta"></div>
              </section>
            </div>
            <aside class="panel settings-panel" id="settingsPanel" aria-labelledby="settingsTitle">
              <h2 id="settingsTitle">Settings</h2>
              <div id="settingsBody"></div>
            </aside>
          </div>
          <div class="action-bar">
            <button type="button" class="btn-primary" id="downloadBtn" disabled>Download</button>
            <button type="button" class="btn-secondary" id="compareBtn" aria-pressed="false">Compare</button>
            <button type="button" class="btn-secondary" id="resetBtn">Choose another image</button>
          </div>
        </div>
        <div class="status" id="status" role="status" aria-live="polite"></div>
      </section>

      <section id="batchView" hidden>
        <div class="panel">
          <h2>Batch resize</h2>
          <p style="color:var(--color-muted);font-size:13px;margin:0 0 12px;">
            Applies the current settings (size, format, fit mode) to every image.
          </p>
          <div class="dropzone batch-drop" id="batchDrop" role="button" tabindex="0" aria-label="Add images to batch">
            <p>Drop multiple images here, or</p>
            <button type="button" class="dropzone-btn" id="batchPick">Add images</button>
            <input type="file" id="batchInput" accept="image/*" multiple hidden>
          </div>
          <div class="batch-queue" id="batchQueue"></div>
          <div class="actions" style="margin-top:16px;">
            <button type="button" class="btn-primary" id="batchProcessBtn" disabled>Process all</button>
            <button type="button" class="btn-secondary" id="batchZipBtn" disabled>Download all as ZIP</button>
          </div>
        </div>
      </section>
    </main>
    <footer class="app-footer">
      No server, no upload — processing happens locally. Built with the Canvas API.
      <a href="/privacy">Privacy</a>
      ·
      <a href="https://shreyashp47.github.io/" target="_blank" rel="noopener">Shreyash Pattewar</a>
      ·
      <a href="https://github.com/shreyashp47" target="_blank" rel="noopener">GitHub</a>
    </footer>
  `;

  const cropViewport = createCropViewport(mustGet<HTMLElement>(root, "#origBox"), {
    aspectRatio: () => state.aspectRatio,
    setSourceRect: (rect) => {
      state.sourceRect = rect;
    },
    onCropChange: () => state.scheduleRender(),
  });

  wireDropzone(root, state, cropViewport);
  wireModeSwitch(root);  initSettings(root, state);
  initRender(root, state);
  initCompare(root, state);
  initBatch(root, state);
  mustGet<HTMLButtonElement>(root, "#resetBtn").addEventListener("click", () => window.location.reload());
  setStatus(root, "Choose an image to get started.");
}

function wireModeSwitch(root: HTMLElement): void {
  const singleBtn = mustGet<HTMLButtonElement>(root, "#modeSingle");
  const batchBtn = mustGet<HTMLButtonElement>(root, "#modeBatch");
  const singleView = mustGet<HTMLElement>(root, "#singleView");
  const batchView = mustGet<HTMLElement>(root, "#batchView");

  const setMode = (mode: "single" | "batch") => {
    const single = mode === "single";
    singleBtn.classList.toggle("active", single);
    batchBtn.classList.toggle("active", !single);
    singleBtn.setAttribute("aria-pressed", String(single));
    batchBtn.setAttribute("aria-pressed", String(!single));
    singleView.hidden = !single;
    batchView.hidden = single;
  };

  singleBtn.addEventListener("click", () => setMode("single"));
  batchBtn.addEventListener("click", () => setMode("batch"));
}

function wireDropzone(
  root: HTMLElement,
  state: AppState,
  cropViewport: { applySource: (bitmap: ImageBitmap, file: File) => void },
): void {
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
    if (file) void loadFile(file, state, root, cropViewport, showError);
  });
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (file) void loadFile(file, state, root, cropViewport, showError);
    fileInput.value = "";
  });
}

async function loadFile(
  file: File,
  state: AppState,
  root: HTMLElement,
  cropViewport: { applySource: (bitmap: ImageBitmap, file: File) => void },
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
    state.sourceRect = undefined;

    const workspace = mustGet<HTMLElement>(root, "#workspace");
    workspace.hidden = false;
    workspace.classList.add("visible");

    cropViewport.applySource(bitmap, file);

    const meta = mustGet<HTMLElement>(root, "#origMeta");
    meta.textContent = `${bitmap.width} x ${bitmap.height} px — ${file.name}`;

    const outBox = mustGet<HTMLElement>(root, "#outBox");
    outBox.classList.toggle("solid", state.options.format !== "image/png");
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
