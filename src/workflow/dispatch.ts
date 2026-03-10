/**
 * Maps CNCF Serverless Workflow call types to Triggerfish tool names.
 * @module
 */

import type { CallTask } from "./types.ts";
import type { WorkflowContext } from "./context.ts";

/** Result of mapping a call task to a tool invocation. */
export interface DispatchTarget {
  readonly toolName: string;
  readonly input: Record<string, unknown>;
}

/** Dispatch error result. */
export interface DispatchError {
  readonly error: string;
}

/** Map a call task to a Triggerfish tool name and resolved input. */
export function resolveCallDispatch(
  task: CallTask,
  context: WorkflowContext,
): DispatchTarget | DispatchError {
  const callType = task.call;
  const rawInput = task.with ?? {};
  const resolvedInput = context.resolveObject(rawInput);

  if (callType === "http") {
    return resolveHttpDispatch(resolvedInput);
  }

  if (callType.startsWith("triggerfish:")) {
    return resolveTriggerFishDispatch(callType, resolvedInput);
  }

  // CNCF standard types we don't support yet
  if (callType === "grpc" || callType === "openapi" || callType === "asyncapi") {
    return { error: `Call type '${callType}' is not yet supported` };
  }

  return { error: `Unknown call type: ${callType}` };
}

/** Check if a dispatch result is an error. */
export function isDispatchError(
  result: DispatchTarget | DispatchError,
): result is DispatchError {
  return "error" in result;
}

function resolveHttpDispatch(
  input: Record<string, unknown>,
): DispatchTarget {
  return {
    toolName: "web_fetch",
    input: {
      url: input.endpoint ?? input.url ?? "",
      method: input.method ?? "GET",
      headers: input.headers,
      body: input.body,
    },
  };
}

function resolveTriggerFishDispatch(
  callType: string,
  input: Record<string, unknown>,
): DispatchTarget | DispatchError {
  const subType = callType.slice("triggerfish:".length);

  switch (subType) {
    case "llm":
      return {
        toolName: "llm_task",
        input: {
          task: input.prompt ?? input.task ?? "",
          tools: input.tools,
          max_iterations: input.max_iterations,
        },
      };

    case "agent":
      return {
        toolName: "subagent",
        input: {
          task: input.prompt ?? input.task ?? "",
          tools: input.tools,
          agent: input.agent,
        },
      };

    case "memory":
      return resolveMemoryDispatch(input);

    case "web_search":
      return {
        toolName: "web_search",
        input: {
          query: input.query ?? "",
          max_results: input.max_results,
        },
      };

    case "web_fetch":
      return {
        toolName: "web_fetch",
        input: {
          url: input.url ?? "",
          method: input.method ?? "GET",
          headers: input.headers,
          body: input.body,
        },
      };

    case "mcp":
      return resolveMcpDispatch(input);

    case "message":
      return {
        toolName: "send_message",
        input: {
          channel: input.channel ?? "",
          text: input.text ?? "",
          recipient: input.recipient,
        },
      };

    default:
      return { error: `Unknown triggerfish call type: triggerfish:${subType}` };
  }
}

function resolveMemoryDispatch(
  input: Record<string, unknown>,
): DispatchTarget | DispatchError {
  const operation = input.operation as string | undefined;
  if (!operation) {
    return { error: "triggerfish:memory requires an 'operation' field" };
  }

  const toolMap: Record<string, string> = {
    save: "memory_save",
    search: "memory_search",
    get: "memory_get",
    list: "memory_list",
    delete: "memory_delete",
  };

  const toolName = toolMap[operation];
  if (!toolName) {
    return {
      error: `Unknown memory operation: ${operation}. Valid: ${Object.keys(toolMap).join(", ")}`,
    };
  }

  const { operation: _op, ...rest } = input;
  return { toolName, input: rest };
}

function resolveMcpDispatch(
  input: Record<string, unknown>,
): DispatchTarget | DispatchError {
  const server = input.server as string | undefined;
  const tool = input.tool as string | undefined;
  if (!server || !tool) {
    return {
      error: "triggerfish:mcp requires 'server' and 'tool' fields",
    };
  }

  return {
    toolName: `mcp__${server}__${tool}`,
    input: (input.arguments as Record<string, unknown>) ?? {},
  };
}
