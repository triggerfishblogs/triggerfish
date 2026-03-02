/**
 * Tool floor registry — minimum classification levels for tool invocation.
 *
 * A tool floor is a minimum session taint required to invoke a tool.
 * Hardcoded floors cannot be lowered by enterprise configuration.
 * Enterprise can only raise floors.
 *
 * @module
 */

import type { ClassificationLevel } from "../types/classification.ts";
import {
  CLASSIFICATION_ORDER,
  maxClassification,
} from "../types/classification.ts";
import { HARDCODED_TOOL_FLOORS } from "./constants.ts";
import { createLogger } from "../logger/logger.ts";

const log = createLogger("security");

/** Registry that resolves tool classification floors. */
export interface ToolFloorRegistry {
  /** Get the effective floor for a tool (max of hardcoded + enterprise). */
  getFloor(toolName: string): ClassificationLevel | null;
  /** Check if a session at the given taint level can invoke a tool. */
  canInvoke(toolName: string, sessionTaint: ClassificationLevel): boolean;
}

/**
 * Create a tool floor registry.
 *
 * Hardcoded floors from `HARDCODED_TOOL_FLOORS` are the non-overridable
 * minimum. Enterprise overrides can raise floors but never lower them.
 *
 * @param enterpriseOverrides - Optional enterprise-configured floor overrides
 * @returns A ToolFloorRegistry instance
 */
export function createToolFloorRegistry(
  enterpriseOverrides?: ReadonlyMap<string, ClassificationLevel>,
): ToolFloorRegistry {
  function getFloor(toolName: string): ClassificationLevel | null {
    const hardcoded = HARDCODED_TOOL_FLOORS.get(toolName) ?? null;
    const enterprise = enterpriseOverrides?.get(toolName) ?? null;

    if (hardcoded && enterprise) {
      // Enterprise can raise but never lower — take the max
      return maxClassification(hardcoded, enterprise);
    }

    return hardcoded ?? enterprise;
  }

  function canInvoke(
    toolName: string,
    sessionTaint: ClassificationLevel,
  ): boolean {
    const floor = getFloor(toolName);
    if (floor === null) return true;
    const allowed =
      CLASSIFICATION_ORDER[sessionTaint] >= CLASSIFICATION_ORDER[floor];
    if (!allowed) {
      log.warn("Tool floor violation", {
        tool: toolName,
        sessionTaint,
        requiredFloor: floor,
      });
    }
    return allowed;
  }

  return { getFloor, canInvoke };
}
