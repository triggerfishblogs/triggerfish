/**
 * Signal JSON-RPC protocol layer.
 *
 * Exports the client factory and all protocol-level building blocks:
 * endpoint parsing, connection management, RPC encoding, and
 * interface assembly.
 *
 * @module
 */

export { createSignalClient } from "./client.ts";
export type { SignalClientOptions } from "./client.ts";

export {
  attemptSignalReconnect,
  destroySignalConnection,
  readSignalSocketLoop,
} from "./signal_connection.ts";
export type { ClientState } from "./signal_connection.ts";

export {
  openSignalConnection,
  parseSignalEndpoint,
} from "./signal_endpoint.ts";
export type { TcpEndpoint, UnixEndpoint } from "./signal_endpoint.ts";

export {
  dispatchSignalMessage,
  drainSignalBuffer,
  encodeSignalRpcRequest,
  formatSignalError,
  rejectPendingSignalRequests,
} from "./signal_rpc.ts";
export type { PendingRequest } from "./signal_rpc.ts";

export { buildSignalClientInterface } from "./signal_interface.ts";
export type { SignalInterfaceDeps } from "./signal_interface.ts";
