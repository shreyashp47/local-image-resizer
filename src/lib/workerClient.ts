import { decodeImage } from "./decode";
import { processImage } from "./processImage";
import type { ProcessOptions, ProcessResult } from "./types";

interface WorkerResponse {
  id: number;
  result?: ProcessResult;
  error?: string;
}

let worker: Worker | null | undefined;
let seq = 0;

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  if (typeof Worker === "undefined") {
    worker = null;
    return null;
  }
  try {
    worker = new Worker(new URL("../workers/imageWorker.ts", import.meta.url), { type: "module" });
  } catch {
    worker = null;
  }
  return worker;
}

/**
 * Process a File in a Web Worker so the UI stays responsive.
 *
 * The worker decodes AND processes the image. If workers are unavailable or
 * the worker fails, this falls back to main-thread processing (with a console
 * warning) so the user is never left without a result.
 */
export async function processInWorker(file: File, options: ProcessOptions): Promise<ProcessResult> {
  const w = getWorker();
  if (!w) return processOnMainThread(file, options);

  const id = ++seq;
  const response = await new Promise<WorkerResponse>((resolve) => {
    const onMessage = (e: MessageEvent<WorkerResponse>) => {
      if (e.data.id !== id) return;
      cleanup();
      resolve(e.data);
    };
    const onError = () => {
      cleanup();
      resolve({ id, error: "Processing worker crashed." });
    };
    const cleanup = () => {
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);
    };
    w.addEventListener("message", onMessage);
    w.addEventListener("error", onError);
    w.postMessage({ id, file, ...options });
  });

  if (response.error) {
    console.warn("Worker processing failed, falling back to main thread:", response.error);
    return processOnMainThread(file, options);
  }
  if (!response.result) {
    throw new Error("Worker returned no result.");
  }
  return response.result;
}

async function processOnMainThread(file: File, options: ProcessOptions): Promise<ProcessResult> {
  const bitmap = await decodeImage(file);
  try {
    return await processImage(bitmap, options);
  } finally {
    bitmap.close();
  }
}
