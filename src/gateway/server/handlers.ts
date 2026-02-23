/**
 * Gateway request handlers — re-exports from domain-specific handler modules.
 *
 * Split into:
 * - handlers_rpc.ts: JSON-RPC types, helpers, and dispatch
 * - handlers_webhook.ts: Webhook HTTP handler
 * - handlers_chat.ts: Chat WebSocket handler
 *
 * This barrel exists for backward compatibility with existing imports.
 *
 * @module
 */

export type { JsonRpcRequest, JsonRpcResponse } from "./handlers_rpc.ts";
export { dispatchJsonRpc, rpcError, rpcSuccess } from "./handlers_rpc.ts";
export { routeWebhookHttp } from "./handlers_webhook.ts";
export { upgradeChatWebSocket } from "./handlers_chat.ts";
