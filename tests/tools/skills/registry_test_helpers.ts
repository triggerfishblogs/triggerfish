/**
 * @module registry_test_helpers
 *
 * Shared fixtures and utilities for Reef registry tests.
 * Provides mock fetch, test catalog builder, and test registry factory.
 */
import { createReefRegistry } from "../../../src/tools/skills/registry.ts";
import type {
  ReefCatalog,
  ReefRegistryOptions,
} from "../../../src/tools/skills/registry.ts";
import { computeSkillHash } from "../../../src/tools/skills/integrity.ts";

/** Valid SKILL.md content used across registry tests. */
export const VALID_SKILL_CONTENT = `---
name: weather
version: 1.0.0
description: Fetch weather data
author: testuser
tags:
  - weather
  - api
category: utilities
classification_ceiling: PUBLIC
requires_tools:
  - web_fetch
network_domains:
  - wttr.in
---
# Weather Skill
Fetches weather data.
`;

/** Build a test catalog with weather (1.0.0, 1.1.0) and deep-research (2.0.0). */
export async function buildTestCatalog(): Promise<ReefCatalog> {
  const checksum = await computeSkillHash(VALID_SKILL_CONTENT);
  return {
    entries: [
      {
        name: "weather",
        version: "1.0.0",
        description: "Fetch weather data",
        author: "testuser",
        tags: ["weather", "api"],
        category: "utilities",
        classificationCeiling: "PUBLIC",
        checksum,
        publishedAt: "2026-01-01T00:00:00Z",
      },
      {
        name: "deep-research",
        version: "2.0.0",
        description: "Multi-step research",
        author: "testuser",
        tags: ["research", "analysis"],
        category: "research",
        classificationCeiling: "CONFIDENTIAL",
        checksum: "abc123",
        publishedAt: "2026-01-15T00:00:00Z",
      },
      {
        name: "weather",
        version: "1.1.0",
        description: "Fetch weather data with forecasts",
        author: "testuser",
        tags: ["weather", "api", "forecast"],
        category: "utilities",
        classificationCeiling: "PUBLIC",
        checksum: "def456",
        publishedAt: "2026-02-01T00:00:00Z",
      },
    ],
    generatedAt: "2026-02-01T00:00:00Z",
  };
}

/** Create a mock fetch function that returns predefined responses. */
export function createMockFetch(
  responses: Record<string, { status: number; body: unknown }>,
): typeof fetch {
  return ((input: string | URL | Request): Promise<Response> => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;
    const match = responses[url];
    if (!match) {
      return Promise.resolve(
        new Response("Not found", { status: 404 }),
      );
    }
    const body = typeof match.body === "string"
      ? match.body
      : JSON.stringify(match.body);
    return Promise.resolve(
      new Response(body, { status: match.status }),
    );
  }) as typeof fetch;
}

/** Create a registry with a mock fetch for testing. */
export async function createTestRegistry(
  overrides?: Partial<ReefRegistryOptions>,
): Promise<ReturnType<typeof createReefRegistry>> {
  const catalog = await buildTestCatalog();
  const mockFetch = createMockFetch({
    "https://test.reef/index/catalog.json": {
      status: 200,
      body: catalog,
    },
    [`https://test.reef/skills/weather/1.1.0/SKILL.md`]: {
      status: 200,
      body: VALID_SKILL_CONTENT,
    },
  });

  return createReefRegistry({
    baseUrl: "https://test.reef",
    fetchFn: mockFetch,
    cacheTtlMs: 60_000,
    ...overrides,
  });
}
