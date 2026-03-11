/**
 * Memory store — search results, filters, selection.
 */

import type { ClassificationLevel, MemoryEntry } from "../types.js";
import { onTopic, send } from "./websocket.svelte.js";

/** Search results. */
let _results: MemoryEntry[] = $state([]);

/** Available tags. */
let _availableTags: string[] = $state([]);

/** Whether results contain hidden restricted entries. */
let _hasRestricted: boolean = $state(false);

/** Selected memory entry for detail view. */
let _selectedEntry: MemoryEntry | null = $state(null);

/** Current search query. */
let _searchQuery: string = $state("");

/** Classification filter. */
let _classificationFilter: ClassificationLevel | "" = $state("");

/** Tag filter. */
let _tagFilter: string = $state("");

/** Get search results. */
export function getResults(): MemoryEntry[] {
  return _results;
}

/** Get available tags. */
export function getAvailableTags(): string[] {
  return _availableTags;
}

/** Get whether results contain hidden restricted entries. */
export function getHasRestricted(): boolean {
  return _hasRestricted;
}

/** Get the selected memory entry. */
export function getSelectedEntry(): MemoryEntry | null {
  return _selectedEntry;
}

/** Get the current search query. */
export function getSearchQuery(): string {
  return _searchQuery;
}

/** Get the classification filter. */
export function getClassificationFilter(): ClassificationLevel | "" {
  return _classificationFilter;
}

/** Get the tag filter. */
export function getTagFilter(): string {
  return _tagFilter;
}

/** Set search query. */
export function setSearchQuery(q: string): void {
  _searchQuery = q;
}

/** Set classification filter. */
export function setClassificationFilter(f: ClassificationLevel | ""): void {
  _classificationFilter = f;
}

/** Set tag filter. */
export function setTagFilter(t: string): void {
  _tagFilter = t;
}

/** Search memories. */
export function searchMemories(): void {
  const payload: Record<string, unknown> = {};
  if (_searchQuery) payload.query = _searchQuery;
  if (_classificationFilter) payload.classification = _classificationFilter;
  if (_tagFilter) payload.tags = [_tagFilter];
  send({ topic: "memory", action: "search", payload });
}

/** Request available tags. */
export function requestTags(): void {
  send({ topic: "memory", action: "tags" });
}

/** Select a memory entry for detail. */
export function selectEntry(entry: MemoryEntry): void {
  _selectedEntry = entry;
}

/** Deselect the current entry. */
export function deselectEntry(): void {
  _selectedEntry = null;
}

/** Delete a memory entry. */
export function deleteEntry(id: string): void {
  send({ topic: "memory", action: "delete", payload: { id } });
}

function handleMessage(msg: Record<string, unknown>): void {
  switch (msg.type) {
    case "search_results":
      _results = msg.entries as MemoryEntry[];
      _hasRestricted = (msg.hasRestricted as boolean) ?? false;
      break;
    case "tags":
      _availableTags = msg.tags as string[];
      break;
    case "deleted":
      if (msg.ok) {
        _results = _results.filter((r) => r.id !== (msg.id as string));
        if (_selectedEntry?.id === (msg.id as string)) {
          _selectedEntry = null;
        }
      }
      break;
  }
}

onTopic("memory", handleMessage);
