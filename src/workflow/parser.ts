/** CNCF Serverless Workflow DSL 1.0 YAML parser. Task validators in validators.ts. @module */

import { parse as parseYaml } from "@std/yaml";
import type {
  CallTask,
  ForTask,
  TaskBase,
  WaitTask,
  WorkflowDefinition,
  WorkflowDocument,
  WorkflowTask,
  WorkflowTaskEntry,
} from "./types.ts";
import type { ClassificationLevel } from "../core/types/classification.ts";
import {
  validateEmitTask,
  validateRaiseTask,
  validateRunTask,
  validateSetTask,
  validateSwitchTask,
} from "./validators.ts";

/** Result type for parser operations. */
export type ParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string };

/** Create a successful ParseResult. */
export function ok<T>(value: T): ParseResult<T> {
  return { ok: true, value };
}

/** Create a failed ParseResult. */
export function err<T>(error: string): ParseResult<T> {
  return { ok: false, error };
}

/** Check whether a value is a non-array object. */
export function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Parse an optional input/output transform block. */
export function parseTransform(raw: unknown): {
  from?: string | Readonly<Record<string, string>>;
  schema?: Readonly<Record<string, unknown>>;
} | undefined {
  if (!isRecord(raw)) return undefined;
  return {
    from: typeof raw["from"] === "string"
      ? raw["from"]
      : isRecord(raw["from"])
      ? (raw["from"] as Readonly<Record<string, string>>)
      : undefined,
    schema: isRecord(raw["schema"])
      ? (raw["schema"] as Readonly<Record<string, unknown>>)
      : undefined,
  };
}

/** Parse an optional timeout block. */
export function parseTimeout(raw: unknown): { after: string } | undefined {
  if (!isRecord(raw)) return undefined;
  if (typeof raw["after"] !== "string") return undefined;
  return { after: raw["after"] as string };
}

/** Parse an optional flow directive (then). */
export function parseFlowDirective(raw: unknown): string | undefined {
  return typeof raw === "string" ? raw : undefined;
}

/** Extract common TaskBase fields from a raw task object. */
export function parseTaskBase(raw: Record<string, unknown>): TaskBase {
  return {
    if: typeof raw["if"] === "string" ? raw["if"] : undefined,
    input: parseTransform(raw["input"]),
    output: parseTransform(raw["output"]),
    timeout: parseTimeout(raw["timeout"]),
    then: parseFlowDirective(raw["then"]),
    metadata: isRecord(raw["metadata"])
      ? (raw["metadata"] as Readonly<Record<string, unknown>>)
      : undefined,
  };
}

const VALID_CLASSIFICATION_LEVELS: readonly string[] = [
  "PUBLIC",
  "INTERNAL",
  "CONFIDENTIAL",
  "RESTRICTED",
];

/** Parse a YAML string into a validated WorkflowDefinition. */
export function parseWorkflowYaml(
  yaml: string,
): ParseResult<WorkflowDefinition> {
  const raw = parseYamlSafe(yaml);
  if (!raw.ok) return raw;
  const root = raw.value;
  if (!isRecord(root)) return err("Workflow YAML must be an object");
  const docResult = validateDocument(root);
  if (!docResult.ok) return docResult;
  const tasksResult = validateDoBlock(root["do"], "root");
  if (!tasksResult.ok) return tasksResult;
  if (tasksResult.value.length === 0) {
    return err("Workflow must contain at least one task in 'do' block");
  }
  const ceiling = parseCeiling(root["classification_ceiling"]);
  if (!ceiling.ok) return ceiling;
  return ok({
    document: docResult.value,
    do: tasksResult.value,
    input: parseTransform(root["input"]),
    output: parseTransform(root["output"]),
    timeout: parseTimeout(root["timeout"]),
    metadata: isRecord(root["metadata"])
      ? (root["metadata"] as Readonly<Record<string, unknown>>)
      : undefined,
    classificationCeiling: ceiling.value,
  });
}

function parseYamlSafe(yaml: string): ParseResult<unknown> {
  try {
    return ok(parseYaml(yaml));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(`YAML parse error: ${msg}`);
  }
}

function validateDocument(
  root: Record<string, unknown>,
): ParseResult<WorkflowDocument> {
  const doc = root["document"];
  if (!isRecord(doc)) return err("Workflow missing required 'document' field");
  if (typeof doc["dsl"] !== "string" || doc["dsl"].length === 0) {
    return err("Document missing required 'dsl' version string");
  }
  if (typeof doc["namespace"] !== "string" || doc["namespace"].length === 0) {
    return err("Document missing required 'namespace' string");
  }
  if (typeof doc["name"] !== "string" || doc["name"].length === 0) {
    return err("Document missing required 'name' string");
  }
  return ok({
    dsl: doc["dsl"] as string,
    namespace: doc["namespace"] as string,
    name: doc["name"] as string,
    version: typeof doc["version"] === "string" ? doc["version"] : undefined,
    description: typeof doc["description"] === "string"
      ? doc["description"]
      : undefined,
  });
}

/** Parse the `do:` block — a list of single-key objects mapping name to task. */
export function validateDoBlock(
  raw: unknown,
  context: string,
): ParseResult<readonly WorkflowTaskEntry[]> {
  if (!Array.isArray(raw)) {
    return err(`${context}: 'do' must be an array of task entries`);
  }
  const entries: WorkflowTaskEntry[] = [];
  for (let i = 0; i < raw.length; i++) {
    const result = validateTaskEntry(raw[i], i, context);
    if (!result.ok) return result;
    entries.push(result.value);
  }

  return ok(entries);
}

function validateTaskEntry(
  item: unknown,
  index: number,
  context: string,
): ParseResult<WorkflowTaskEntry> {
  if (!isRecord(item)) {
    return err(`${context}: task entry ${index} must be an object`);
  }
  const keys = Object.keys(item);
  if (keys.length !== 1) {
    return err(
      `${context}: task entry ${index} must have exactly one key (the task name), found ${keys.length}`,
    );
  }
  const name = keys[0];
  const taskDef = item[name];
  if (!isRecord(taskDef)) {
    return err(`${context}: task '${name}' definition must be an object`);
  }
  const taskResult = dispatchTaskType(taskDef, `${context}.${name}`);
  if (!taskResult.ok) return taskResult;
  return ok({ name, task: taskResult.value });
}

/** Dispatch a raw task object to the appropriate type-specific validator. */
function dispatchTaskType(
  raw: Record<string, unknown>,
  context: string,
): ParseResult<WorkflowTask> {
  const base = parseTaskBase(raw);
  if ("call" in raw) return validateCallTask(raw, base);
  if ("run" in raw) return validateRunTask(raw, base, context);
  if ("set" in raw) return validateSetTask(raw, base, context);
  if ("switch" in raw) return validateSwitchTask(raw, base, context);
  if ("for" in raw) return validateForTask(raw, base, context);
  if ("raise" in raw) return validateRaiseTask(raw, base, context);
  if ("emit" in raw) return validateEmitTask(raw, base, context);
  if ("wait" in raw) return validateWaitTask(raw, base);
  if ("listen" in raw) {
    return err(`${context}: 'listen' task type is not yet supported`);
  }
  return err(
    `${context}: task has no recognized type (call, run, set, switch, for, raise, emit, wait)`,
  );
}

function validateCallTask(
  raw: Record<string, unknown>,
  base: TaskBase,
): ParseResult<CallTask> {
  if (typeof raw["call"] !== "string" || raw["call"].length === 0) {
    return err("Call task requires a non-empty 'call' string");
  }
  const withArgs = isRecord(raw["with"])
    ? (raw["with"] as Readonly<Record<string, unknown>>)
    : undefined;
  return ok({
    ...base,
    type: "call" as const,
    call: raw["call"] as string,
    with: withArgs,
  });
}

function validateForTask(
  raw: Record<string, unknown>,
  base: TaskBase,
  context: string,
): ParseResult<ForTask> {
  const forDef = raw["for"];
  if (!isRecord(forDef)) {
    return err(`${context}: 'for' must be an object with 'each' and 'in'`);
  }
  if (typeof forDef["each"] !== "string") {
    return err(`${context}: for.each must be a string (variable name)`);
  }
  if (typeof forDef["in"] !== "string") {
    return err(
      `${context}: for.in must be a string (expression referencing a collection)`,
    );
  }
  const doResult = validateDoBlock(raw["do"], `${context}.for`);
  if (!doResult.ok) return doResult;
  return ok({
    ...base,
    type: "for" as const,
    for: {
      each: forDef["each"] as string,
      in: forDef["in"] as string,
      at: typeof forDef["at"] === "string" ? forDef["at"] : undefined,
    },
    do: doResult.value,
  });
}

function validateWaitTask(
  raw: Record<string, unknown>,
  base: TaskBase,
): ParseResult<WaitTask> {
  if (typeof raw["wait"] !== "string") {
    return err("Wait task requires a duration string (e.g., 'PT5S')");
  }
  return ok({ ...base, type: "wait" as const, wait: raw["wait"] as string });
}

function parseCeiling(
  raw: unknown,
): ParseResult<ClassificationLevel | undefined> {
  if (raw === undefined || raw === null) return ok(undefined);
  if (typeof raw !== "string") {
    return err("classification_ceiling must be a string");
  }
  if (!VALID_CLASSIFICATION_LEVELS.includes(raw)) {
    return err(
      `classification_ceiling must be one of: ${
        VALID_CLASSIFICATION_LEVELS.join(", ")
      }`,
    );
  }
  return ok(raw as ClassificationLevel);
}
