/**
 * Svelte action: dispatch event when clicking outside the element.
 */

export function clickOutside(
  node: HTMLElement,
): { destroy(): void } {
  function handleClick(event: MouseEvent): void {
    if (!node.contains(event.target as Node)) {
      node.dispatchEvent(new CustomEvent("clickoutside"));
    }
  }

  document.addEventListener("click", handleClick, true);

  return {
    destroy() {
      document.removeEventListener("click", handleClick, true);
    },
  };
}
