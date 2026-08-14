/// <reference lib="webworker" />
import { processImage } from "../lib/processImage";
import type { ProcessOptions, ProcessResult } from "../lib/types";

interface WorkerRequest extends ProcessOptions {
  id: number;
  file: File;
}

interface WorkerResponse {
  id: number;
  result?: ProcessResult;
  error?: string;
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, file, width, height, mode, format, quality } = e.data;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    try {
      const result = await processImage(bitmap, { width, height, mode, format, quality });
      const response: WorkerResponse = { id, result };
      self.postMessage(response);
    } finally {
      bitmap.close();
    }
  } catch (err) {
    const response: WorkerResponse = {
      id,
      error: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(response);
  }
};
