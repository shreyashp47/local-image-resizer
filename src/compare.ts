import { mustGet } from "./lib/dom";
import type { AppState } from "./state";

/**
 * Before/after compare view: original (left of the divider) vs output (right).
 * The divider is draggable with the pointer and keyboard-operable (arrows).
 */
export function initCompare(root: HTMLElement, state: AppState): void {
  const toggleBtn = mustGet<HTMLButtonElement>(root, "#compareBtn");
  const outBox = mustGet<HTMLElement>(root, "#outBox");

  let divider: HTMLElement;
  let origImg: HTMLImageElement;
  let outImg: HTMLImageElement;
  let position = 50;

  toggleBtn.addEventListener("click", () => {
    const active = toggleBtn.classList.toggle("active");
    toggleBtn.setAttribute("aria-pressed", String(active));
    if (active) show();
    else hide();
  });

  function show(): void {
    if (!state.file || !state.output) return;
    outBox.innerHTML = "";
    outBox.classList.add("compare");

    const container = document.createElement("div");
    container.className = "compare-view";
    container.style.aspectRatio = `${state.output.width} / ${state.output.height}`;

    outImg = document.createElement("img");
    outImg.src = URL.createObjectURL(state.output.blob);
    outImg.alt = "Processed output";
    outImg.className = "compare-img compare-out";

    origImg = document.createElement("img");
    origImg.src = URL.createObjectURL(state.file);
    origImg.alt = "Original image";
    origImg.className = "compare-img compare-orig";

    divider = document.createElement("div");
    divider.className = "compare-divider";
    divider.setAttribute("role", "slider");
    divider.setAttribute("aria-label", "Compare position");
    divider.setAttribute("aria-valuemin", "0");
    divider.setAttribute("aria-valuemax", "100");
    divider.setAttribute("aria-valuenow", String(position));
    divider.setAttribute("tabindex", "0");

    container.append(origImg, outImg, divider);
    outBox.appendChild(container);

    divider.addEventListener("keydown", (e) => {
      const step = e.shiftKey ? 10 : 5;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPosition(position - step);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setPosition(position + step);
      }
    });

    let dragging = false;
    divider.addEventListener("pointerdown", (e) => {
      dragging = true;
      divider.setPointerCapture(e.pointerId);
    });
    divider.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const rect = container.getBoundingClientRect();
      setPosition(((e.clientX - rect.left) / rect.width) * 100);
    });
    divider.addEventListener("pointerup", () => {
      dragging = false;
    });

    setPosition(position);
  }

  function hide(): void {
    outBox.classList.remove("compare");
    outBox.innerHTML = "";
    const img = document.createElement("img");
    img.src = URL.createObjectURL(state.output!.blob);
    img.alt = "Processed output";
    outBox.appendChild(img);
    // Clear original preview object URL when output replaces the compare view
  }

  function setPosition(value: number): void {
    position = Math.min(100, Math.max(0, value));
    divider.style.left = `${position}%`;
    origImg.style.clipPath = `inset(0 calc(100% - ${position}%) 0 0)`;
    outImg.style.clipPath = `inset(0 0 0 ${position}%)`;
    divider.setAttribute("aria-valuenow", String(Math.round(position)));
  }
}
