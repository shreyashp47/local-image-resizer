import { debounce, formatBytes, mustGet, setStatus } from "./lib/dom";
import { downloadName } from "./lib/download";
import type { AppState } from "./state";
import { buildProcessOptions } from "./state";
import { processInWorker } from "./lib/workerClient";

/**
 * Live-renders the output whenever settings change. Processing runs in a Web
 * Worker; results are guarded by a render token so a slow run never overwrites
 * a newer one. Downloads are wired here too.
 */
export function initRender(root: HTMLElement, state: AppState): void {
  const outBox = mustGet<HTMLElement>(root, "#outBox");
  const outMeta = mustGet<HTMLElement>(root, "#outMeta");
  const downloadBtn = mustGet<HTMLButtonElement>(root, "#downloadBtn");
  let latestBlob: Blob | null = null;

  const scheduleRender = debounce(() => void renderOutput(), 150);

  async function renderOutput(): Promise<void> {
    if (!state.file) return;
    const token = ++state.renderToken;
    setStatus(root, "Processing…", "loading");
    try {
      const result = await processInWorker(state.file, buildProcessOptions(state));
      if (token !== state.renderToken) return;

      state.output = result;
      latestBlob = result.blob;
      outBox.classList.toggle("solid", state.options.format !== "image/png");
      outBox.innerHTML = "";
      const img = document.createElement("img");
      img.src = URL.createObjectURL(result.blob);
      img.alt = "Processed output";
      outBox.appendChild(img);
      outMeta.textContent = `${result.width} x ${result.height} px — ${formatBytes(result.blob.size)} — ${
        state.options.format.split("/")[1].toUpperCase()
      }`;
      downloadBtn.disabled = false;
      setStatus(root, "Ready to download.");
    } catch (err) {
      if (token !== state.renderToken) return;
      setStatus(root, err instanceof Error ? err.message : "Processing failed.", "error");
      console.error(err);
    }
  }

  downloadBtn.addEventListener("click", () => {
    if (!latestBlob) return;
    const name = downloadName(state.file?.name ?? "resized", state.options, state.presetId);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(latestBlob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  });

  state.scheduleRender = scheduleRender;
  state.renderOutput = renderOutput;
}
