/**
 * Svelte action: auto-scroll to bottom on content changes.
 *
 * Respects user scroll position — only auto-scrolls if already near bottom.
 */

export function autoScroll(
  node: HTMLElement,
): { destroy(): void } {
  let isNearBottom = true;

  function checkScroll(): void {
    const threshold = 40;
    isNearBottom =
      node.scrollHeight - node.scrollTop - node.clientHeight < threshold;
  }

  function scrollToBottom(): void {
    if (isNearBottom) {
      node.scrollTop = node.scrollHeight;
    }
  }

  const observer = new MutationObserver(() => {
    scrollToBottom();
  });

  node.addEventListener("scroll", checkScroll);
  observer.observe(node, { childList: true, subtree: true });

  // Initial scroll
  scrollToBottom();

  return {
    destroy() {
      node.removeEventListener("scroll", checkScroll);
      observer.disconnect();
    },
  };
}
