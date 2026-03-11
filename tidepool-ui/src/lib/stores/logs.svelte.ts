/**
 * Logs store — entries, filters, pause state.
 */

import type { LogEntry, LogLevel } from "../types.js";
import { onTopic, send } from "./websocket.svelte.js";

/** All log entries. */
let _entries: LogEntry[] = $state([]);

/** Active level filters. */
let _activeLevels: Record<LogLevel, boolean> = $state({
  DEBUG: true,
  INFO: true,
  WARN: true,
  ERROR: true,
});

/** Known log sources for filter dropdown. */
let _knownSources: string[] = $state([]);

/** Current source filter. */
let _sourceFilter: string = $state("");

/** Search text. */
let _searchText: string = $state("");

/** Paused state. */
let _paused: boolean = $state(false);

/** Buffered entries while paused. */
let buffered: LogEntry[] = [];

/** Maximum entries to keep. */
const MAX_ENTRIES = 2000;

/** Get all log entries. */
export function getEntries(): LogEntry[] {
  return _entries;
}

/** Get active level filters. */
export function getActiveLevels(): Record<LogLevel, boolean> {
  return _activeLevels;
}

/** Get known log sources. */
export function getKnownSources(): string[] {
  return _knownSources;
}

/** Get current source filter. */
export function getSourceFilter(): string {
  return _sourceFilter;
}

/** Get search text. */
export function getSearchText(): string {
  return _searchText;
}

/** Get paused state. */
export function getPaused(): boolean {
  return _paused;
}

/** Toggle a level filter. */
export function toggleLevel(level: LogLevel): void {
  _activeLevels[level] = !_activeLevels[level];
}

/** Toggle pause state. */
export function togglePause(): void {
  _paused = !_paused;
  if (!_paused) {
    _entries.push(...buffered);
    if (_entries.length > MAX_ENTRIES) {
      _entries = _entries.slice(-MAX_ENTRIES);
    }
    buffered = [];
  }
}

/** Clear all log entries. */
export function clearLogs(): void {
  _entries = [];
  buffered = [];
}

/** Set source filter. */
export function setSourceFilter(source: string): void {
  _sourceFilter = source;
}

/** Set search text. */
export function setSearchText(text: string): void {
  _searchText = text;
}

/** Subscribe to log stream. */
export function subscribeLogs(): void {
  send({
    topic: "logs",
    action: "subscribe",
    payload: { levels: ["DEBUG", "INFO", "WARN", "ERROR"] },
  });
}

/** Unsubscribe from log stream. */
export function unsubscribeLogs(): void {
  send({ topic: "logs", action: "unsubscribe" });
}

/** Check if entry passes current filters. */
export function passesFilter(entry: LogEntry): boolean {
  if (!_activeLevels[entry.level]) return false;
  if (_sourceFilter && entry.source !== _sourceFilter) return false;
  if (
    _searchText &&
    !entry.message.toLowerCase().includes(_searchText.toLowerCase())
  ) {
    return false;
  }
  return true;
}

function addSource(source: string): void {
  if (!_knownSources.includes(source)) {
    _knownSources = [..._knownSources, source].sort();
  }
}

function addEntry(entry: LogEntry): void {
  addSource(entry.source);
  if (_paused) {
    buffered.push(entry);
  } else {
    _entries.push(entry);
    if (_entries.length > MAX_ENTRIES) {
      _entries = _entries.slice(-MAX_ENTRIES);
    }
  }
}

function handleMessage(msg: Record<string, unknown>): void {
  switch (msg.type) {
    case "log_entry":
      addEntry(msg.entry as LogEntry);
      break;
    case "log_backfill":
      for (const entry of msg.entries as LogEntry[]) {
        addEntry(entry);
      }
      break;
  }
}

onTopic("logs", handleMessage);
