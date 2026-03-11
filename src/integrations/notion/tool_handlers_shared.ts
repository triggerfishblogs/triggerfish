/**
 * Notion tool handler shared utilities — classification resolution and property formatting.
 *
 * @module
 */

import {
  type ClassificationLevel,
  compareClassification,
} from "../../core/types/classification.ts";
import { createLogger } from "../../core/logger/mod.ts";
import type { NotionToolContext } from "./tool_context.ts";

const log = createLogger("notion:handlers");

/** Resolve the effective classification from context, honouring floor. */
export function resolveNotionClassification(
  ctx: NotionToolContext,
): ClassificationLevel {
  const taint = ctx.sessionTaint();
  if (!ctx.classificationFloor) return taint;
  if (compareClassification(ctx.classificationFloor, taint) > 0) {
    log.warn("Notion classification floor overrides session taint", {
      operation: "resolveNotionClassification",
      classificationFloor: ctx.classificationFloor,
      sessionTaint: taint,
      effective: ctx.classificationFloor,
    });
    return ctx.classificationFloor;
  }
  return taint;
}

/** Format properties for JSON output (simplified for LLM readability). */
export function formatProperties(
  props: Readonly<
    Record<string, { readonly type: string; readonly value: unknown }>
  >,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(props)) {
    result[key] = prop.value;
  }
  return result;
}
