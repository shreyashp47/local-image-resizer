export function mustGet<T extends HTMLElement>(root: HTMLElement | Document, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`Element not found: ${selector}`);
  return el;
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): (...args: A) => void {
  let timer: number | undefined;
  return (...args: A) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), ms);
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function setStatus(root: HTMLElement, message: string, className?: "loading" | "error"): void {
  const el = mustGet<HTMLElement>(root, "#status");
  el.textContent = message;
  el.className = `status${className ? ` ${className}` : ""}`;
}
