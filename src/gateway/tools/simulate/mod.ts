/**
 * Simulate tool executor — gateway wiring layer.
 *
 * @module
 */

export {
  computeSimulatedTaint,
  createSimulateToolExecutor,
  evaluateSimulatedBlocked,
} from "./simulate_executor.ts";
export type { SimulateToolContext } from "./simulate_executor.ts";
