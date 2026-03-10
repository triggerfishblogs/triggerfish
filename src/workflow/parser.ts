/**
 * CNCF Serverless Workflow DSL 1.0 YAML parser and validator.
 * @module
 */

import { parse as parseYaml } from "@std/yaml";
import type {
  CallTask,
  EmitTask,
  ForTask,
  RaiseTask,
  RunTask,
  SetTask,
  SwitchTask,
  TaskBase,
  WaitTask,
  WorkflowDefinition,
  WorkflowDocument,
  WorkflowTask,
  WorkflowTaskEntry,
} from "./types.ts";
import type { ClassificationLevel } from "../core/types/classification.ts";

/** Result type for parser operations. */
export type ParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string };

function ok<T>(value: T): ParseResult<T> {
  return { ok: true, value };
}

function err<T>(error: string): ParseResult<T> {
  return { ok: false, error };
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
  if (!isRecord(root)) {
    return err("Workflow YAML must be an object");
  }

  const docResult = parseDocument(root);
  if (!docResult.ok) return docResult;

  const tasksResult = parseDoBlock(root["do"], "root");
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

function parseDocument(
  root: Record<string, unknown>,
): ParseResult<WorkflowDocument> {
  const doc = root["document"];
  if (!isRecord(doc)) {
    return err("Workflow missing required 'document' field");
  }

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

/** Parse the `do:` block — a list of single-key objects mapping name→task. */
function parseDoBlock(
  raw: unknown,
  context: string,
): ParseResult<readonly WorkflowTaskEntry[]> {
  if (!Array.isArray(raw)) {
    return err(`${context}: 'do' must be an array of task entries`);
  }

  const entries: WorkflowTaskEntry[] = [];

  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (!isRecord(item)) {
      return err(`${context}: task entry ${i} must be an object`);
    }

    const keys = Object.keys(item);
    if (keys.length !== 1) {
      return err(
        `${context}: task entry ${i} must have exactly one key (the task name), found ${keys.length}`,
      );
    }

    const name = keys[0];
    const taskDef = item[name];
    if (!isRecord(taskDef)) {
      return err(`${context}: task '${name}' definition must be an object`);
    }

    const taskResult = parseTask(taskDef, `${context}.${name}`);
    if (!taskResult.ok) return taskResult;

    entries.push({ name, task: taskResult.value });
  }

  return ok(entries);
}

/** Parse a single task definition into a typed WorkflowTask. */
function parseTask(
  raw: Record<string, unknown>,
  context: string,
): ParseResult<WorkflowTask> {
  const base = parseTaskBase(raw);

  if ("call" in raw) return parseCallTask(raw, base);
  if ("run" in raw) return parseRunTask(raw, base, context);
  if ("set" in raw) return parseSetTask(raw, base, context);
  if ("switch" in raw) return parseSwitchTask(raw, base, context);
  if ("for" in raw) return parseForTask(raw, base, context);
  if ("raise" in raw) return parseRaiseTask(raw, base, context);
  if ("emit" in raw) return parseEmitTask(raw, base, context);
  if ("wait" in raw) return parseWaitTask(raw, base);
  if ("listen" in raw) {
    return err(
      `${context}: 'listen' task type is not yet supported`,
    );
  }

  return err(
    `${context}: task has no recognized type (call, run, set, switch, for, raise, emit, wait)`,
  );
}

function parseTaskBase(raw: Record<string, unknown>): TaskBase {
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

function parseCallTask(
  raw: Record<string, unknown>,
  base: TaskBase,
): ParseResult<CallTask> {
  if (typeof raw["call"] !== "string" || raw["call"].length === 0) {
    return err("Call task requires a non-empty 'call' string");
  }

  return ok({
    ...base,
    type: "call" as const,
    call: raw["call"] as string,
    with: isRecord(raw["with"])
      ? (raw["with"] as Readonly<Record<string, unknown>>)
      : undefined,
  });
}

function parseRunTask(
  raw: Record<string, unknown>,
  base: TaskBase,
  context: string,
): ParseResult<RunTask> {
  const run = raw["run"];
  if (!isRecord(run)) {
    return err(
      `${context}: 'run' must be an object with shell, script, or workflow`,
    );
  }

  if ("shell" in run) {
    const shell = run["shell"];
    if (!isRecord(shell) || typeof shell["command"] !== "string") {
      return err(`${context}: run.shell must have a 'command' string`);
    }
    return ok({
      ...base,
      type: "run" as const,
      run: {
        shell: {
          command: shell["command"] as string,
          arguments: isRecord(shell["arguments"])
            ? (shell["arguments"] as Readonly<Record<string, string>>)
            : undefined,
          environment: isRecord(shell["environment"])
            ? (shell["environment"] as Readonly<Record<string, string>>)
            : undefined,
        },
      },
    });
  }

  if ("script" in run) {
    const script = run["script"];
    if (
      !isRecord(script) || typeof script["language"] !== "string" ||
      typeof script["code"] !== "string"
    ) {
      return err(
        `${context}: run.script must have 'language' and 'code' strings`,
      );
    }
    return ok({
      ...base,
      type: "run" as const,
      run: {
        script: {
          language: script["language"] as string,
          code: script["code"] as string,
          arguments: isRecord(script["arguments"])
            ? (script["arguments"] as Readonly<Record<string, string>>)
            : undefined,
        },
      },
    });
  }

  if ("workflow" in run) {
    const wf = run["workflow"];
    if (!isRecord(wf) || typeof wf["name"] !== "string") {
      return err(`${context}: run.workflow must have a 'name' string`);
    }
    return ok({
      ...base,
      type: "run" as const,
      run: {
        workflow: {
          name: wf["name"] as string,
          version: typeof wf["version"] === "string"
            ? wf["version"]
            : undefined,
          input: isRecord(wf["input"])
            ? (wf["input"] as Readonly<Record<string, unknown>>)
            : undefined,
        },
      },
    });
  }

  return err(
    `${context}: run task must have 'shell', 'script', or 'workflow' target`,
  );
}

function parseSetTask(
  raw: Record<string, unknown>,
  base: TaskBase,
  context: string,
): ParseResult<SetTask> {
  const set = raw["set"];
  if (!isRecord(set)) {
    return err(`${context}: 'set' must be an object of key-value pairs`);
  }

  return ok({
    ...base,
    type: "set" as const,
    set: set as Readonly<Record<string, unknown>>,
  });
}

function parseSwitchTask(
  raw: Record<string, unknown>,
  base: TaskBase,
  context: string,
): ParseResult<SwitchTask> {
  const sw = raw["switch"];
  if (!Array.isArray(sw)) {
    return err(`${context}: 'switch' must be an array of case entries`);
  }

  const cases: { name: string; when?: string; then: string }[] = [];
  for (let i = 0; i < sw.length; i++) {
    const entry = sw[i];
    if (!isRecord(entry)) {
      return err(`${context}: switch case ${i} must be an object`);
    }
    const keys = Object.keys(entry);
    if (keys.length !== 1) {
      return err(
        `${context}: switch case ${i} must have exactly one key (the case name)`,
      );
    }
    const caseName = keys[0];
    const caseDef = entry[caseName];
    if (!isRecord(caseDef)) {
      return err(`${context}: switch case '${caseName}' must be an object`);
    }
    if (typeof caseDef["then"] !== "string") {
      return err(
        `${context}: switch case '${caseName}' must have a 'then' string`,
      );
    }
    cases.push({
      name: caseName,
      when: typeof caseDef["when"] === "string" ? caseDef["when"] : undefined,
      then: caseDef["then"] as string,
    });
  }

  return ok({
    ...base,
    type: "switch" as const,
    switch: cases,
  });
}

function parseForTask(
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

  const doResult = parseDoBlock(raw["do"], `${context}.for`);
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

function parseRaiseTask(
  raw: Record<string, unknown>,
  base: TaskBase,
  context: string,
): ParseResult<RaiseTask> {
  const raise = raw["raise"];
  if (!isRecord(raise)) {
    return err(`${context}: 'raise' must be an object with 'error'`);
  }
  const error = raise["error"];
  if (!isRecord(error)) {
    return err(`${context}: raise.error must be an object`);
  }
  if (typeof error["status"] !== "number") {
    return err(`${context}: raise.error.status must be a number`);
  }
  if (typeof error["type"] !== "string") {
    return err(`${context}: raise.error.type must be a string`);
  }
  if (typeof error["title"] !== "string") {
    return err(`${context}: raise.error.title must be a string`);
  }

  return ok({
    ...base,
    type: "raise" as const,
    raise: {
      error: {
        status: error["status"] as number,
        type: error["type"] as string,
        title: error["title"] as string,
        detail: typeof error["detail"] === "string"
          ? error["detail"]
          : undefined,
      },
    },
  });
}

function parseEmitTask(
  raw: Record<string, unknown>,
  base: TaskBase,
  context: string,
): ParseResult<EmitTask> {
  const emit = raw["emit"];
  if (!isRecord(emit)) {
    return err(`${context}: 'emit' must be an object with 'event'`);
  }
  const event = emit["event"];
  if (!isRecord(event)) {
    return err(`${context}: emit.event must be an object`);
  }
  if (typeof event["type"] !== "string") {
    return err(`${context}: emit.event.type must be a string`);
  }

  return ok({
    ...base,
    type: "emit" as const,
    emit: {
      event: {
        type: event["type"] as string,
        source: typeof event["source"] === "string"
          ? event["source"]
          : undefined,
        data: isRecord(event["data"])
          ? (event["data"] as Readonly<Record<string, unknown>>)
          : undefined,
      },
    },
  });
}

function parseWaitTask(
  raw: Record<string, unknown>,
  base: TaskBase,
): ParseResult<WaitTask> {
  if (typeof raw["wait"] !== "string") {
    return err("Wait task requires a duration string (e.g., 'PT5S')");
  }

  return ok({
    ...base,
    type: "wait" as const,
    wait: raw["wait"] as string,
  });
}

function parseTransform(
  raw: unknown,
): {
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

function parseTimeout(
  raw: unknown,
): { after: string } | undefined {
  if (!isRecord(raw)) return undefined;
  if (typeof raw["after"] !== "string") return undefined;
  return { after: raw["after"] as string };
}

function parseFlowDirective(raw: unknown): string | undefined {
  if (typeof raw === "string") return raw;
  return undefined;
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

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}
