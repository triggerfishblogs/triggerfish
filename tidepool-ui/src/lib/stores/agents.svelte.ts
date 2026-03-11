/**
 * Agents store — sessions, teams, selection.
 */

import type { AgentSession, AgentTeam } from "../types.js";
import { onTopic, send } from "./websocket.svelte.js";
import { setBadge } from "./nav.svelte.js";

/** All sessions. */
let _sessions: AgentSession[] = $state([]);

/** All teams. */
let _teams: AgentTeam[] = $state([]);

/** Currently selected session ID. */
let _selectedSessionId: string | null = $state(null);

/** Currently selected session detail. */
let _selectedSession: AgentSession | null = $state(null);

/** Get all sessions. */
export function getSessions(): AgentSession[] {
  return _sessions;
}

/** Get all teams. */
export function getTeams(): AgentTeam[] {
  return _teams;
}

/** Get the currently selected session ID. */
export function getSelectedSessionId(): string | null {
  return _selectedSessionId;
}

/** Get the currently selected session detail. */
export function getSelectedSession(): AgentSession | null {
  return _selectedSession;
}

/** Request the session list from server. */
export function requestSessionList(): void {
  send({ topic: "agents", action: "list_sessions" });
}

/** Select a session for detail view. */
export function selectSession(session: AgentSession): void {
  if (_selectedSessionId) {
    send({
      topic: "agents",
      action: "unsubscribe_session",
      payload: { sessionId: _selectedSessionId },
    });
  }
  _selectedSessionId = session.sessionId;
  _selectedSession = session;
  send({
    topic: "agents",
    action: "subscribe_session",
    payload: { sessionId: session.sessionId },
  });
}

/** Deselect the current session. */
export function deselectSession(): void {
  if (_selectedSessionId) {
    send({
      topic: "agents",
      action: "unsubscribe_session",
      payload: { sessionId: _selectedSessionId },
    });
  }
  _selectedSessionId = null;
  _selectedSession = null;
}

/** Terminate a background session. */
export function terminateSession(sessionId: string): void {
  send({ topic: "agents", action: "terminate", payload: { sessionId } });
}

function handleMessage(msg: Record<string, unknown>): void {
  switch (msg.type) {
    case "session_list":
      _sessions = msg.sessions as AgentSession[];
      _teams = msg.teams as AgentTeam[];
      updateBadge();
      break;
    case "session_created":
    case "session_updated":
    case "session_terminated":
      requestSessionList();
      break;
  }
}

function updateBadge(): void {
  const activeCount = _sessions.filter(
    (s) => s.status === "green" || s.status === "yellow",
  ).length;
  setBadge("agents", activeCount);
}

onTopic("agents", handleMessage);
