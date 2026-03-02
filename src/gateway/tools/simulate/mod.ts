/**
 * Simulate tool executor — gateway wiring layer.
 *
 * @module
 */

export {
  createSimulateToolExecutor,
  computeSimulatedTaint,
  evaluateSimulatedBlocked,
} from "./simulate_executor.ts";
export type { SimulateToolContext } from "./simulate_executor.ts";
