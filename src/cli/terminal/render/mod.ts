/**
 * Terminal rendering — input bar, scroll output, and spinner display.
 * @module
 */

export type {
  InputBarLayout,
  InputBarRenderOptions,
} from "./input_bar_render.ts";
export {
  computeInputBarLayout,
  renderInputBarFrame,
} from "./input_bar_render.ts";

export {
  writeLinesToScrollRegion,
  writeStreamingChunk,
} from "./scroll_output.ts";

export { renderSpinnerStatusText } from "./spinner_render.ts";
