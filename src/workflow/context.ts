/**
 * Workflow data context with immutable state management.
 *
 * Provides a `WorkflowContext` interface for setting, merging, and resolving
 * data within workflow execution. Expression evaluation is delegated to
 * `./expressions.ts`.
 * @module
 */

import {
  containsExpression,
  deepResolveExpressions,
  evaluateConditionExpression,
  evaluateExpression,
  resolveDotPath,
} from "./expressions.ts";

/** Immutable workflow data context. */
export interface WorkflowContext {
  /** Current data state. */
  readonly data: Readonly<Record<string, unknown>>;
  /** Set a value at a dot-path, returning a new context. */
  set(path: string, value: unknown): WorkflowContext;
  /** Merge multiple key-value pairs, returning a new context. */
  merge(values: Readonly<Record<string, unknown>>): WorkflowContext;
  /** Resolve a dot-path expression against the data. */
  resolve(path: string): unknown;
  /** Evaluate an expression string, resolving all `${ }` interpolations. */
  evaluate(expression: string): unknown;
  /** Evaluate an expression as a boolean for conditionals. */
  evaluateCondition(expression: string): boolean;
  /** Deep-resolve all expression strings in an object tree. */
  resolveObject(
    obj: Readonly<Record<string, unknown>>,
  ): Record<string, unknown>;
}

/** Create a new workflow data context with optional initial data. */
export function createWorkflowContext(
  initial?: Readonly<Record<string, unknown>>,
): WorkflowContext {
  const data: Readonly<Record<string, unknown>> = initial
    ? structuredClone(initial) as Record<string, unknown>
    : {};
  return buildContext(data);
}

function buildContext(
  data: Readonly<Record<string, unknown>>,
): WorkflowContext {
  return {
    data,
    set: (path: string, value: unknown): WorkflowContext =>
      buildContext(setNestedValue(data, path, value)),
    merge: (values: Readonly<Record<string, unknown>>): WorkflowContext =>
      buildContext(mergeValues(data, values)),
    resolve: (path: string): unknown => resolveDotPath(data, path),
    evaluate: (expression: string): unknown =>
      evaluateExpression(data, expression),
    evaluateCondition: (expression: string): boolean =>
      evaluateConditionExpression(data, expression),
    resolveObject: (
      obj: Readonly<Record<string, unknown>>,
    ): Record<string, unknown> =>
      deepResolveExpressions(data, obj) as Record<string, unknown>,
  };
}

interface KeySegment {
  readonly type: "key";
  readonly value: string;
}

interface IndexSegment {
  readonly type: "index";
  readonly index: number;
}

type PathSegment = KeySegment | IndexSegment;

/** Parse a dot-path string into segments, handling array indices. */
function parseDotPath(path: string): readonly PathSegment[] {
  const segments: PathSegment[] = [];
  const parts = path.split(".");

  for (const part of parts) {
    if (part === "") continue;
    const bracketMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (bracketMatch) {
      segments.push({ type: "key", value: bracketMatch[1] });
      segments.push({ type: "index", index: parseInt(bracketMatch[2], 10) });
    } else {
      segments.push({ type: "key", value: part });
    }
  }

  return segments;
}

/** Set a value at a dot-path in the data, returning a new data object. */
function setNestedValue(
  data: Readonly<Record<string, unknown>>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const cleanPath = path.trim().replace(/^\$?\.\s*/, "");
  const segments = parseDotPath(cleanPath);

  if (segments.length === 0) {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return { ...data, ...(value as Record<string, unknown>) };
    }
    return { ...data };
  }

  return setAtSegments(
    data as Record<string, unknown>,
    segments,
    0,
    value,
  );
}

function setAtSegments(
  obj: Record<string, unknown>,
  segments: readonly PathSegment[],
  index: number,
  value: unknown,
): Record<string, unknown> {
  const segment = segments[index];

  if (index === segments.length - 1) {
    if (segment.type === "key") {
      return { ...obj, [segment.value]: value };
    }
    // Array index at leaf -- unlikely but handle
    return { ...obj };
  }

  if (segment.type === "key") {
    const child = obj[segment.value];
    const nextChild = (typeof child === "object" && child !== null)
      ? child as Record<string, unknown>
      : {};
    return {
      ...obj,
      [segment.value]: setAtSegments(
        nextChild,
        segments,
        index + 1,
        value,
      ),
    };
  }

  return { ...obj };
}

/** Merge values into the data context. Resolves expressions in values. */
function mergeValues(
  data: Readonly<Record<string, unknown>>,
  values: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const result = { ...data };
  for (const [key, val] of Object.entries(values)) {
    if (typeof val === "string" && containsExpression(val)) {
      result[key] = evaluateExpression(data, val);
    } else {
      result[key] = val;
    }
  }
  return result;
}
