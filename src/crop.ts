import { mustGet } from "./lib/dom";
import { ASPECT_CHANGE_EVENT } from "./state";
import {
  clampPan,
  constrainToAspect,
  coverScale,
  displayedSize,
  imageBounds,
  moveCrop,
  recenterOnZoom,
  resizeCrop,
  viewportToNatural,
  type Handle,
  type Rect,
} from "./lib/cropGeometry";

const MIN_CROP = 24;
const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const ZOOM_MAX = 4;

/** Narrow dependency set — keeps the viewport decoupled from AppState. */
export interface CropDeps {
  aspectRatio: () => number | undefined;
  setSourceRect: (rect: Rect) => void;
  onCropChange: () => void;
}

export interface CropViewport {
  /** (Re)initialize the viewport for a newly decoded image. */
  applySource(bitmap: ImageBitmap, file: File): void;
  /** Release listeners and object URLs. */
  dispose(): void;
}

/**
 * Interactive crop viewport: draggable/resizable crop box over a
 * zoomable/panable image. All geometry lives in cropGeometry.ts; this module
 * only wires pointer/keyboard events to it and reports the result through
 * CropDeps (natural pixel coordinates) for the processing pipeline.
 */
export function createCropViewport(box: HTMLElement, deps: CropDeps): CropViewport {
  box.classList.add("crop-host");
  box.innerHTML = `
    <div class="crop-viewport" id="cropViewport">
      <img class="crop-image" id="cropImage" alt="Original image, crop view">
      <div class="crop-shade" id="shadeTop"></div>
      <div class="crop-shade" id="shadeBottom"></div>
      <div class="crop-shade" id="shadeLeft"></div>
      <div class="crop-shade" id="shadeRight"></div>
      <div class="crop-box" id="cropBox" tabindex="0" aria-label="Crop region, draggable">
        ${HANDLES.map((h) => `<span class="crop-handle" data-handle="${h}"></span>`).join("")}
      </div>
    </div>
    <div class="crop-controls">
      <label class="crop-zoom">
        <span>Zoom</span>
        <input type="range" id="cropZoom" min="1" max="${ZOOM_MAX}" step="0.1" value="1" aria-label="Zoom level">
        <span id="cropZoomVal">100%</span>
      </label>
      <span class="crop-readout" id="cropReadout" aria-live="polite"></span>
    </div>
  `;

  const viewport = mustGet<HTMLElement>(box, "#cropViewport");
  const img = mustGet<HTMLImageElement>(box, "#cropImage");
  const cropBoxEl = mustGet<HTMLElement>(box, "#cropBox");
  const shadeTop = mustGet<HTMLElement>(box, "#shadeTop");
  const shadeBottom = mustGet<HTMLElement>(box, "#shadeBottom");
  const shadeLeft = mustGet<HTMLElement>(box, "#shadeLeft");
  const shadeRight = mustGet<HTMLElement>(box, "#shadeRight");
  const zoomInput = mustGet<HTMLInputElement>(box, "#cropZoom");
  const zoomVal = mustGet<HTMLElement>(box, "#cropZoomVal");
  const readout = mustGet<HTMLElement>(box, "#cropReadout");

  let imgW = 0;
  let imgH = 0;
  let boxW = 0;
  let boxH = 0;
  let scale = 1;
  let offset: { x: number; y: number } = { x: 0, y: 0 };
  let crop: Rect = { x: 0, y: 0, width: 0, height: 0 };
  let drag:
    | {
        type: "move" | "resize";
        handle?: Handle;
        startX: number;
        startY: number;
        startCrop: Rect;
      }
    | null = null;
  let panning = false;
  let lastPointer = { x: 0, y: 0 };
  let objectUrl: string | null = null;

  function dispSize(): { width: number; height: number } {
    return displayedSize(imgW, imgH, scale);
  }

  function bounds(): Rect {
    return imageBounds(offset.x, offset.y, dispSize().width, dispSize().height);
  }

  function clampCropToBounds(c: Rect): Rect {
    const b = bounds();
    const w = Math.min(c.width, b.width);
    const h = Math.min(c.height, b.height);
    const x = Math.max(b.x, Math.min(c.x, b.x + b.width - w));
    const y = Math.max(b.y, Math.min(c.y, b.y + b.height - h));
    return { x, y, width: w, height: h };
  }

  function emitCrop(): void {
    const a = viewportToNatural(crop.x, crop.y, offset.x, offset.y, scale);
    const b = viewportToNatural(crop.x + crop.width, crop.y + crop.height, offset.x, offset.y, scale);
    const rect: Rect = {
      x: Math.min(Math.max(0, a.x), imgW),
      y: Math.min(Math.max(0, a.y), imgH),
      width: Math.max(1, Math.min(imgW, b.x) - Math.min(Math.max(0, a.x), imgW)),
      height: Math.max(1, Math.min(imgH, b.y) - Math.min(Math.max(0, a.y), imgH)),
    };
    deps.setSourceRect(rect);
    readout.textContent = `${Math.round(rect.width)} x ${Math.round(rect.height)} px source`;
    deps.onCropChange();
  }

  function render(): void {
    const disp = dispSize();
    img.style.width = `${disp.width}px`;
    img.style.height = `${disp.height}px`;
    img.style.left = `${offset.x}px`;
    img.style.top = `${offset.y}px`;

    cropBoxEl.style.left = `${crop.x}px`;
    cropBoxEl.style.top = `${crop.y}px`;
    cropBoxEl.style.width = `${crop.width}px`;
    cropBoxEl.style.height = `${crop.height}px`;

    shadeTop.style.height = `${crop.y}px`;
    shadeBottom.style.top = `${crop.y + crop.height}px`;
    shadeBottom.style.height = `${boxH - crop.y - crop.height}px`;
    shadeLeft.style.top = `${crop.y}px`;
    shadeLeft.style.height = `${crop.height}px`;
    shadeLeft.style.width = `${crop.x}px`;
    shadeRight.style.top = `${crop.y}px`;
    shadeRight.style.height = `${crop.height}px`;
    shadeRight.style.left = `${crop.x + crop.width}px`;
    shadeRight.style.width = `${boxW - crop.x - crop.width}px`;

    zoomVal.textContent = `${Math.round(zoomInput.valueAsNumber * 100)}%`;
    emitCrop();
  }

  function setZoom(next: number): void {
    const oldDisp = dispSize();
    scale = coverScale(imgW, imgH, boxW, boxH) * next;
    const newDisp = dispSize();
    offset = recenterOnZoom(offset.x, offset.y, oldDisp.width, oldDisp.height, newDisp.width, newDisp.height, boxW, boxH);
    crop = clampCropToBounds(crop);
    render();
  }

  const localPoint = (e: PointerEvent): { x: number; y: number } => {
    const r = viewport.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  // ---- pan: drag the image outside the crop box -------------------------
  img.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    const p = localPoint(e);
    if (p.x >= crop.x && p.x <= crop.x + crop.width && p.y >= crop.y && p.y <= crop.y + crop.height) return;
    panning = true;
    lastPointer = p;
    img.setPointerCapture(e.pointerId);
    img.classList.add("panning");
  });
  img.addEventListener("pointermove", (e) => {
    if (!panning) return;
    const p = localPoint(e);
    const dx = p.x - lastPointer.x;
    const dy = p.y - lastPointer.y;
    lastPointer = p;
    offset = clampPan(offset.x + dx, offset.y + dy, dispSize().width, dispSize().height, boxW, boxH);
    crop = clampCropToBounds(crop);
    render();
  });
  const endPan = () => {
    panning = false;
    img.classList.remove("panning");
  };
  img.addEventListener("pointerup", endPan);
  img.addEventListener("pointercancel", endPan);

  // ---- move & resize the crop box --------------------------------------
  cropBoxEl.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const target = e.target as HTMLElement;
    const handle = target.closest<HTMLElement>(".crop-handle")?.dataset.handle as Handle | undefined;
    const p = localPoint(e);
    drag = {
      type: handle ? "resize" : "move",
      handle,
      startX: p.x,
      startY: p.y,
      startCrop: { ...crop },
    };
    cropBoxEl.setPointerCapture(e.pointerId);
    cropBoxEl.focus();
  });
  cropBoxEl.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const p = localPoint(e);
    const dx = p.x - drag.startX;
    const dy = p.y - drag.startY;
    if (drag.type === "move") {
      crop = moveCrop(drag.startCrop, dx, dy, bounds());
    } else if (drag.handle) {
      crop = resizeCrop(drag.startCrop, drag.handle, dx, dy, bounds(), deps.aspectRatio(), MIN_CROP);
    }
    render();
  });
  const endDrag = () => {
    drag = null;
  };
  cropBoxEl.addEventListener("pointerup", endDrag);
  cropBoxEl.addEventListener("pointercancel", endDrag);

  cropBoxEl.addEventListener("keydown", (e) => {
    const step = e.shiftKey ? 10 : 1;
    let dx = 0;
    let dy = 0;
    if (e.key === "ArrowLeft") dx = -step;
    else if (e.key === "ArrowRight") dx = step;
    else if (e.key === "ArrowUp") dy = -step;
    else if (e.key === "ArrowDown") dy = step;
    else return;
    e.preventDefault();
    crop = moveCrop(crop, dx, dy, bounds());
    render();
  });

  // ---- zoom: slider + wheel --------------------------------------------
  zoomInput.addEventListener("input", () => {
    setZoom(zoomInput.valueAsNumber);
  });
  viewport.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      const next = Math.min(ZOOM_MAX, Math.max(1, zoomInput.valueAsNumber + delta));
      zoomInput.value = String(next);
      setZoom(next);
    },
    { passive: false },
  );

  // ---- settings -> aspect lock ------------------------------------------
  const onAspectChange = () => {
    const aspect = deps.aspectRatio();
    if (aspect) {
      crop = constrainToAspect(crop, aspect, bounds());
      render();
    }
  };
  document.addEventListener(ASPECT_CHANGE_EVENT, onAspectChange);

  // ---- window resize -----------------------------------------------------
  const handleResize = () => {
    const prevW = boxW;
    const prevH = boxH;
    const r = viewport.getBoundingClientRect();
    boxW = Math.max(1, r.width);
    boxH = Math.max(1, r.height);
    if (imgW <= 0 || prevW <= 0) return;
    const kx = boxW / prevW;
    const ky = boxH / prevH;
    scale = coverScale(imgW, imgH, boxW, boxH) * zoomInput.valueAsNumber;
    offset = { x: (boxW - dispSize().width) / 2, y: (boxH - dispSize().height) / 2 };
    crop = clampCropToBounds({ x: crop.x * kx, y: crop.y * ky, width: crop.width * kx, height: crop.height * ky });
    render();
  };
  const resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(viewport);

  function applySource(bitmap: ImageBitmap, file: File): void {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);
    imgW = bitmap.width;
    imgH = bitmap.height;
    img.src = objectUrl;
    img.alt = file.name;

    const r = viewport.getBoundingClientRect();
    boxW = Math.max(1, r.width);
    boxH = Math.max(1, r.height);
    scale = coverScale(imgW, imgH, boxW, boxH);
    offset = { x: (boxW - dispSize().width) / 2, y: (boxH - dispSize().height) / 2 };
    crop = {
      x: Math.max(0, offset.x),
      y: Math.max(0, offset.y),
      width: boxW - Math.max(0, offset.x) + Math.min(0, offset.x),
      height: boxH - Math.max(0, offset.y) + Math.min(0, offset.y),
    };
    const aspect = deps.aspectRatio();
    if (aspect) crop = constrainToAspect(crop, aspect, bounds());
    render();
  }

  function dispose(): void {
    document.removeEventListener(ASPECT_CHANGE_EVENT, onAspectChange);
    resizeObserver.disconnect();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }

  return { applySource, dispose };
}