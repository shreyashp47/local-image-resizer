import { MAX_SOURCE_PIXELS } from "./processImage";

export const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

export class ImageDecodeError extends Error {
  readonly code: "unsupported" | "corrupt" | "too-large" | "decode-failed";

  constructor(code: ImageDecodeError["code"], message: string) {
    super(message);
    this.name = "ImageDecodeError";
    this.code = code;
  }
}

/**
 * Decode a File into an ImageBitmap.
 *
 * - Applies EXIF orientation (`imageOrientation: "from-image"`) so phone
 *   photos render upright.
 * - Only accepts known-raster formats; animated GIFs/AVIF decode to their
 *   first frame, which is the expected icon behavior.
 * - Throws friendly `ImageDecodeError`s instead of failing silently.
 */
export async function decodeImage(file: File): Promise<ImageBitmap> {
  if (!SUPPORTED_TYPES.includes(file.type)) {
    throw new ImageDecodeError(
      "unsupported",
      `Unsupported format: ${file.type || "unknown"}. Use JPEG, PNG, WebP, GIF, or AVIF.`,
    );
  }

  if (file.size > 100 * 1024 * 1024) {
    throw new ImageDecodeError("too-large", "File is over 100 MB — too large to process in the browser.");
  }

  let bitmap: ImageBitmap;
  if ("createImageBitmap" in window) {
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      bitmap = await decodeViaImageElement(file);
    }
  } else {
    bitmap = await decodeViaImageElement(file);
  }

  const megapixels = (bitmap.width * bitmap.height) / 1_000_000;
  if (bitmap.width * bitmap.height > MAX_SOURCE_PIXELS) {
    bitmap.close();
    throw new ImageDecodeError(
      "too-large",
      `Image is ${megapixels.toFixed(0)} MP — over the 150 MP processing limit.`,
    );
  }

  return bitmap;
}

async function decodeViaImageElement(file: File): Promise<ImageBitmap> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () =>
        reject(new ImageDecodeError("corrupt", "The file could not be read as an image. It may be corrupted."));
      img.src = url;
    });
    // NOTE: HTMLImageElement + drawImage respects EXIF orientation in modern
    // browsers via the default `image-orientation: from-image` rendering.
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ImageDecodeError("decode-failed", "Could not create a 2D rendering context.");
    ctx.drawImage(img, 0, 0);
    const bitmap = await createImageBitmap(canvas);
    return bitmap;
  } finally {
    URL.revokeObjectURL(url);
  }
}
