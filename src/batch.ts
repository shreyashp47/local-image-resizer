import { zipSync } from "fflate";
import { decodeImage, ImageDecodeError } from "./lib/decode";
import { formatBytes, mustGet, setStatus } from "./lib/dom";
import { downloadName } from "./lib/download";
import { processInWorker } from "./lib/workerClient";
import type { AppState } from "./state";

export type BatchStatus = "pending" | "processing" | "done" | "error";

interface BatchItemEls {
  dims: HTMLElement;
  statusEl: HTMLElement;
  dlBtn: HTMLButtonElement;
}

export interface BatchItem {
  id: number;
  file: File;
  bitmap: ImageBitmap | null;
  status: BatchStatus;
  error?: string;
  blob: Blob | null;
  els?: BatchItemEls;
}

let nextId = 1;

export function initBatch(root: HTMLElement, state: AppState): void {
  const view = mustGet<HTMLElement>(root, "#batchView");
  const dropzone = mustGet<HTMLElement>(view, "#batchDrop");
  const input = mustGet<HTMLInputElement>(view, "#batchInput");
  const pickBtn = mustGet<HTMLButtonElement>(view, "#batchPick");
  const queueEl = mustGet<HTMLElement>(view, "#batchQueue");
  const zipBtn = mustGet<HTMLButtonElement>(view, "#batchZipBtn");
  const processBtn = mustGet<HTMLButtonElement>(view, "#batchProcessBtn");

  const items: BatchItem[] = [];
  let processing = false;

  const renderQueueState = () => {
    const anyItems = items.length > 0;
    processBtn.disabled = !anyItems || processing;
    renderZipState();
  };

  const addFiles = (files: File[]) => {
    for (const file of files) {
      const item: BatchItem = { id: nextId++, file, bitmap: null, status: "pending", blob: null };
      items.push(item);
      renderItem(item);
    }
    renderQueueState();
  };

  const renderItem = (item: BatchItem) => {
    const row = document.createElement("div");
    row.className = "batch-item";
    row.dataset.id = String(item.id);

    const thumb = document.createElement("div");
    thumb.className = "batch-thumb";
    const img = document.createElement("img");
    img.alt = "";
    img.src = URL.createObjectURL(item.file);
    thumb.appendChild(img);

    const info = document.createElement("div");
    info.className = "batch-info";
    const name = document.createElement("div");
    name.className = "batch-name";
    name.textContent = item.file.name;
    const dims = document.createElement("div");
    dims.className = "batch-dims";
    info.append(name, dims);

    const statusEl = document.createElement("div");
    statusEl.className = "batch-status";
    statusEl.textContent = "Queued";

    const actions = document.createElement("div");
    actions.className = "batch-actions";
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "batch-remove";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
      const idx = items.indexOf(item);
      if (idx >= 0) items.splice(idx, 1);
      row.remove();
      renderQueueState();
    });
    const dlBtn = document.createElement("button");
    dlBtn.type = "button";
    dlBtn.className = "batch-dl";
    dlBtn.textContent = "Download";
    dlBtn.disabled = true;
    dlBtn.addEventListener("click", () => {
      if (item.blob) {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(item.blob);
        a.download = downloadName(item.file.name, state.options);
        a.click();
      }
    });
    actions.append(removeBtn, dlBtn);

    item.els = { dims, statusEl, dlBtn };
    row.append(thumb, info, statusEl, actions);
    queueEl.appendChild(row);
  };

  const updateItem = (item: BatchItem, status: BatchStatus, error?: string) => {
    item.status = status;
    item.error = error;
    if (!item.els) return;
    const { dims, statusEl, dlBtn } = item.els;
    dims.textContent = item.bitmap ? `${item.bitmap.width} x ${item.bitmap.height} px` : "—";
    statusEl.textContent =
      status === "pending"
        ? "Queued"
        : status === "processing"
          ? "Processing…"
          : status === "done"
            ? formatBytes(item.blob?.size ?? 0)
            : item.error ?? "Error";
    statusEl.className = `batch-status status-${status}`;
    dlBtn.disabled = status !== "done";
  };

  const processQueue = async () => {
    if (processing) return;
    processing = true;
    zipBtn.disabled = true;
    setStatus(root, "Processing batch…", "loading");
    for (const item of items) {
      if (item.status === "done" || item.status === "processing") continue;
      updateItem(item, "processing");
      try {
        const bitmap = await decodeImage(item.file);
        item.bitmap = bitmap;
        const result = await processInWorker(item.file, state.options);
        item.blob = result.blob;
        updateItem(item, "done");
      } catch (err) {
        updateItem(item, "error", err instanceof ImageDecodeError ? err.message : "Processing failed.");
      }
    }
    processing = false;
    renderZipState();
    setStatus(root, "Batch finished.");
  };

  const renderZipState = () => {
    const anyDone = items.some((i) => i.status === "done");
    zipBtn.disabled = !anyDone || processing;
  };

  const downloadAll = () => {
    const done = items.filter((i) => i.status === "done" && i.blob);
    if (done.length === 0) return;
    const files: Record<string, Uint8Array> = {};
    for (const item of done) {
      void item.blob!.arrayBuffer().then((buf) => {
        files[downloadName(item.file.name, state.options)] = new Uint8Array(buf);
        if (Object.keys(files).length === done.length) {
          const zipped = zipSync(files);
          const blob = new Blob([zipped], { type: "application/zip" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "resized-images.zip";
          a.click();
        }
      });
    }
  };

  processBtn.addEventListener("click", () => void processQueue());
  zipBtn.addEventListener("click", downloadAll);
  pickBtn.addEventListener("click", () => input.click());
  dropzone.addEventListener("click", () => input.click());

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
    const files = Array.from(e.dataTransfer?.files ?? []).filter((f) => f.type.startsWith("image/"));
    if (files.length) addFiles(files);
  });
  input.addEventListener("change", () => {
    const files = Array.from(input.files ?? []);
    if (files.length) addFiles(files);
    input.value = "";
  });
}
