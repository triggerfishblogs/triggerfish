/**
 * WebSocket event handlers for connection status and notifications.
 *
 * Handles connected, taint_changed, mcp_status, notification, and
 * bumpers_status events from the daemon.
 * @module
 */

import { renderPrompt } from "../../cli/chat/chat_ui.ts";
import type { ScreenManager } from "../../cli/terminal/screen.ts";
import type { LineEditor } from "../../cli/terminal/terminal.ts";
import type { OrchestratorEvent } from "../../agent/orchestrator/orchestrator_types.ts";
import type { ChatEvent } from "../../core/types/chat_event.ts";

import type { WsRouterDeps, WsRouterState } from "./chat_ws_types.ts";

/** Resolved context passed to each per-event-type handler. */
export interface RouterContext {
  readonly screen: ScreenManager;
  readonly isTty: boolean;
  readonly editor: LineEditor;
  readonly eventHandler: (evt: OrchestratorEvent) => void;
  readonly state: WsRouterState;
  readonly deps: WsRouterDeps;
}

/** Handle the "connected" event from the daemon. */
export function routeConnectedEvent(
  evt: Extract<ChatEvent, { type: "connected" }>,
  ctx: RouterContext,
  resolveConnected: () => void,
): void {
  ctx.state.providerName = evt.provider;
  ctx.state.workspacePath = evt.workspace ?? "";
  if (evt.taint) {
    ctx.screen.setTaint(evt.taint);
  }
  resolveConnected();
}

/** Handle "taint_changed" event. */
export function routeTaintChangedEvent(
  evt: Extract<ChatEvent, { type: "taint_changed" }>,
  ctx: RouterContext,
): void {
  ctx.screen.setTaint(evt.level);
  if (ctx.isTty) ctx.screen.redrawInput(ctx.editor);
}

/** Handle "mcp_status" event. */
export function routeMcpStatusEvent(
  evt: Extract<ChatEvent, { type: "mcp_status" }>,
  ctx: RouterContext,
): void {
  if (ctx.isTty) {
    ctx.screen.setMcpStatus(evt.connected, evt.configured);
    ctx.screen.redrawInput(ctx.editor);
  }
}

/** Handle "notification" event. */
export function routeNotificationEvent(
  evt: Extract<ChatEvent, { type: "notification" }>,
  ctx: RouterContext,
): void {
  if (ctx.isTty) {
    ctx.screen.writeOutput(`  \x1b[33m\u26a1 [trigger]\x1b[0m ${evt.message}`);
    ctx.screen.writeOutput("");
    ctx.screen.redrawInput(ctx.editor);
  } else {
    console.log(`\n  [trigger] ${evt.message}\n`);
    renderPrompt();
  }
}

/** Handle "bumpers_status" event. */
export function routeBumpersStatusEvent(
  evt: Extract<ChatEvent, { type: "bumpers_status" }>,
  ctx: RouterContext,
): void {
  const label = evt.enabled ? "Bumpers deployed." : "No bumpers deployed.";
  ctx.screen.writeOutput(`  ${label}`);
  if (ctx.isTty) ctx.screen.redrawInput(ctx.editor);
}
