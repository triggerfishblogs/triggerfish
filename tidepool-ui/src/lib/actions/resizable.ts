/**
 * Svelte action: make an element horizontally resizable via drag handle.
 *
 * Expects a child element with `data-resize-handle` attribute.
 */

export function resizable(
  node: HTMLElement,
  options?: { min?: number; max?: number },
): { destroy(): void } {
  const min = options?.min ?? 200;
  const max = options?.max ?? 600;
  const handle = node.querySelector("[data-resize-handle]") as HTMLElement;
  if (!handle) return { destroy() {} };

  let startX = 0;
  let startWidth = 0;

  function onMouseDown(e: MouseEvent): void {
    startX = e.clientX;
    startWidth = node.getBoundingClientRect().width;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function onMouseMove(e: MouseEvent): void {
    const delta = e.clientX - startX;
    const newWidth = Math.min(max, Math.max(min, startWidth + delta));
    node.style.width = `${newWidth}px`;
  }

  function onMouseUp(): void {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }

  handle.addEventListener("mousedown", onMouseDown);

  return {
    destroy() {
      handle.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    },
  };
}
