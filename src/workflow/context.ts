/**
 * Workflow data context with expression evaluation.
 *
 * Supports `${ .path.to.value }` expression syntax for interpolation
 * and simple jq-like dot-path access.
 * @module
 */

/** Expression delimiter pattern: ${ expression } */
const EXPR_PATTERN = /\$\{\s*([^}]+?)\s*\}/g;

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
    resolve: (path: string): unknown => resolvePath(data, path),
    evaluate: (expression: string): unknown =>
      evaluateExpression(data, expression),
    evaluateCondition: (expression: string): boolean =>
      evaluateConditionExpr(data, expression),
    resolveObject: (
      obj: Readonly<Record<string, unknown>>,
    ): Record<string, unknown> =>
      deepResolve(data, obj) as Record<string, unknown>,
  };
}

/** Resolve a dot-path like `.result.items[0].name` against the data. */
function resolvePath(
  data: Readonly<Record<string, unknown>>,
  path: string,
): unknown {
  const cleanPath = path.trim().replace(/^\$?\.\s*/, "");
  if (cleanPath === "" || cleanPath === "$") return data;

  const segments = parseDotPath(cleanPath);
  // deno-lint-ignore no-explicit-any
  let current: any = data;

  for (const segment of segments) {
    if (current === null || current === undefined) return undefined;

    if (segment.type === "key") {
      if (typeof current !== "object") return undefined;
      current = current[segment.value];
    } else {
      if (!Array.isArray(current)) return undefined;
      current = current[segment.index];
    }
  }

  return current;
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

/** Evaluate a `${ expression }` string. */
function evaluateExpression(
  data: Readonly<Record<string, unknown>>,
  expression: string,
): unknown {
  const trimmed = expression.trim();

  // If the entire string is a single expression, return the raw value (not stringified)
  const singleMatch = trimmed.match(/^\$\{\s*([^}]+?)\s*\}$/);
  if (singleMatch) {
    return evaluateSingleExpression(data, singleMatch[1].trim());
  }

  // Multiple expressions or mixed text: interpolate as string
  if (EXPR_PATTERN.test(trimmed)) {
    EXPR_PATTERN.lastIndex = 0;
    return trimmed.replace(EXPR_PATTERN, (_match, expr: string) => {
      const value = evaluateSingleExpression(data, expr.trim());
      return value === undefined ? "" : String(value);
    });
  }

  // No expressions — return the literal string
  return trimmed;
}

/** Evaluate a single expression (without delimiters). */
function evaluateSingleExpression(
  data: Readonly<Record<string, unknown>>,
  expr: string,
): unknown {
  // Comparison: .path == "value" or .path != "value"
  const compMatch = expr.match(
    /^(.+?)\s*(==|!=|>=|<=|>|<)\s*(.+)$/,
  );
  if (compMatch) {
    const left = resolveExprValue(data, compMatch[1].trim());
    const op = compMatch[2];
    const right = resolveExprValue(data, compMatch[3].trim());
    return compareValues(left, op, right);
  }

  // Arithmetic: .a + .b, .a - .b, etc.
  const arithMatch = expr.match(
    /^(.+?)\s*(\+|-|\*|\/|%)\s*(.+)$/,
  );
  if (arithMatch) {
    const left = resolveExprValue(data, arithMatch[1].trim());
    const op = arithMatch[2];
    const right = resolveExprValue(data, arithMatch[3].trim());
    return computeArithmetic(left, op, right);
  }

  // Simple path resolution
  return resolveExprValue(data, expr);
}

/** Resolve an expression value — either a literal or a path. */
function resolveExprValue(
  data: Readonly<Record<string, unknown>>,
  expr: string,
): unknown {
  // String literal: "value" or 'value'
  const strMatch = expr.match(/^["'](.*)["']$/);
  if (strMatch) return strMatch[1];

  // Number literal
  if (/^-?\d+(\.\d+)?$/.test(expr)) return parseFloat(expr);

  // Boolean literals
  if (expr === "true") return true;
  if (expr === "false") return false;

  // Null literal
  if (expr === "null") return null;

  // Dot-path
  return resolvePath(data, expr);
}

function compareValues(left: unknown, op: string, right: unknown): boolean {
  switch (op) {
    case "==":
      return left === right;
    case "!=":
      return left !== right;
    case ">":
      return (left as number) > (right as number);
    case "<":
      return (left as number) < (right as number);
    case ">=":
      return (left as number) >= (right as number);
    case "<=":
      return (left as number) <= (right as number);
    default:
      return false;
  }
}

function computeArithmetic(left: unknown, op: string, right: unknown): unknown {
  const l = typeof left === "number" ? left : parseFloat(String(left));
  const r = typeof right === "number" ? right : parseFloat(String(right));
  if (isNaN(l) || isNaN(r)) return undefined;

  switch (op) {
    case "+":
      return l + r;
    case "-":
      return l - r;
    case "*":
      return l * r;
    case "/":
      return r === 0 ? undefined : l / r;
    case "%":
      return r === 0 ? undefined : l % r;
    default:
      return undefined;
  }
}

/** Evaluate an expression as a boolean for `if:` and `switch.when`. */
function evaluateConditionExpr(
  data: Readonly<Record<string, unknown>>,
  expression: string,
): boolean {
  const result = evaluateExpression(data, expression);
  return isTruthy(result);
}

/** JavaScript-style truthiness, but `0` and `""` are falsy. */
function isTruthy(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value.length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
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
    // Array index at leaf — unlikely but handle
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
    if (typeof val === "string" && EXPR_PATTERN.test(val)) {
      EXPR_PATTERN.lastIndex = 0;
      result[key] = evaluateExpression(data, val);
    } else {
      result[key] = val;
    }
  }
  return result;
}

/** Deep-resolve all expression strings in an object or value. */
function deepResolve(
  data: Readonly<Record<string, unknown>>,
  value: unknown,
): unknown {
  if (typeof value === "string") {
    if (EXPR_PATTERN.test(value)) {
      EXPR_PATTERN.lastIndex = 0;
      return evaluateExpression(data, value);
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepResolve(data, item));
  }

  if (value !== null && typeof value === "object") {
    const resolved: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      resolved[k] = deepResolve(data, v);
    }
    return resolved;
  }

  return value;
}
