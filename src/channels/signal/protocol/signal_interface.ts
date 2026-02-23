/**
 * Signal client interface assembly.
 *
 * Builds the SignalClientInterface object from injected closure helpers,
 * mapping each method to the appropriate JSON-RPC call or state mutation.
 *
 * @module
 */

import { createLogger } from "../../../core/logger/logger.ts";
import type { Result } from "../../../core/types/classification.ts";
import type {
  JsonRpcResponse,
  SignalClientInterface,
  SignalContactEntry,
  SignalGroupEntry,
  SignalNotification,
} from "../types.ts";
import {
  openSignalConnection,
  parseSignalEndpoint,
} from "./signal_endpoint.ts";
import { formatSignalError } from "./signal_rpc.ts";
import { type ClientState, destroySignalConnection } from "./signal_connection.ts";
import {
  marshalSignalContactEntry,
  marshalSignalGroupEntry,
} from "../install/signal_marshal.ts";

/** Dependencies injected from the client factory closure. */
export interface SignalInterfaceDeps {
  readonly state: ClientState;
  readonly endpoint: string;
  readonly log: ReturnType<typeof createLogger>;
  readonly startReadLoop: () => Promise<void>;
  readonly submitRpc: (
    method: string,
    params: Record<string, unknown>,
    timeoutMs?: number,
  ) => Promise<JsonRpcResponse>;
}

/** Build the connect method. */
function buildConnect(deps: SignalInterfaceDeps): SignalClientInterface["connect"] {
  return async (): Promise<Result<void, string>> => {
    try {
      if (!deps.state.conn) {
        const target = parseSignalEndpoint(deps.endpoint);
        deps.state.conn = await openSignalConnection(target);
      }
      deps.startReadLoop();
      return { ok: true, value: undefined };
    } catch (err) {
      return {
        ok: false,
        error: `Failed to connect: ${formatSignalError(err)}`,
      };
    }
  };
}

/** Build the disconnect method. */
function buildDisconnect(deps: SignalInterfaceDeps): SignalClientInterface["disconnect"] {
  return (): Promise<void> => {
    destroySignalConnection(deps.state, deps.log);
    return Promise.resolve();
  };
}

/** Submit a JSON-RPC call and return a Result with timestamp. */
async function submitTimestampRpc(
  deps: SignalInterfaceDeps,
  method: string,
  params: Record<string, unknown>,
): Promise<Result<{ readonly timestamp: number }, string>> {
  try {
    const response = await deps.submitRpc(method, params);
    if (response.error) {
      return { ok: false, error: response.error.message };
    }
    const result = response.result as { timestamp: number } | undefined;
    return { ok: true, value: { timestamp: result?.timestamp ?? 0 } };
  } catch (err) {
    return { ok: false, error: formatSignalError(err) };
  }
}

/** Submit a JSON-RPC call and return a void Result. */
async function submitVoidRpc(
  deps: SignalInterfaceDeps,
  method: string,
  params: Record<string, unknown>,
  timeoutMs?: number,
): Promise<Result<void, string>> {
  try {
    const response = await deps.submitRpc(method, params, timeoutMs);
    if (response.error) {
      return { ok: false, error: response.error.message };
    }
    return { ok: true, value: undefined };
  } catch (err) {
    return { ok: false, error: formatSignalError(err) };
  }
}

/** Assemble the SignalClientInterface from closure dependencies. */
export function buildSignalClientInterface(
  deps: SignalInterfaceDeps,
): SignalClientInterface {
  return {
    connect: buildConnect(deps),
    disconnect: buildDisconnect(deps),

    sendMessage(
      recipient: string,
      message: string,
    ): Promise<Result<{ readonly timestamp: number }, string>> {
      return submitTimestampRpc(deps, "send", {
        recipient: [recipient],
        message,
      });
    },

    sendGroupMessage(
      groupId: string,
      message: string,
    ): Promise<Result<{ readonly timestamp: number }, string>> {
      return submitTimestampRpc(deps, "send", { groupId, message });
    },

    sendTyping(recipient: string): Promise<Result<void, string>> {
      return submitVoidRpc(deps, "sendTyping", { recipient });
    },

    sendTypingStop(recipient: string): Promise<Result<void, string>> {
      return submitVoidRpc(deps, "sendTyping", { recipient, stop: true });
    },

    onNotification(
      handler: (notification: SignalNotification) => void,
    ): void {
      deps.state.notificationHandler = handler;
    },

    ping(): Promise<Result<void, string>> {
      return submitVoidRpc(deps, "version", {}, 3000);
    },

    async listGroups(): Promise<
      Result<readonly SignalGroupEntry[], string>
    > {
      try {
        const response = await deps.submitRpc("listGroups", {});
        if (response.error) {
          return { ok: false, error: response.error.message };
        }
        const groups =
          response.result as readonly Record<string, unknown>[] ?? [];
        return { ok: true, value: groups.map(marshalSignalGroupEntry) };
      } catch (err) {
        return { ok: false, error: formatSignalError(err) };
      }
    },

    async listContacts(): Promise<
      Result<readonly SignalContactEntry[], string>
    > {
      try {
        const response = await deps.submitRpc("listContacts", {});
        if (response.error) {
          return { ok: false, error: response.error.message };
        }
        const contacts =
          response.result as readonly Record<string, unknown>[] ?? [];
        return { ok: true, value: contacts.map(marshalSignalContactEntry) };
      } catch (err) {
        return { ok: false, error: formatSignalError(err) };
      }
    },
  };
}
