/**
 * Plugin SDK providing permission-aware methods for plugins.
 *
 * The SDK enforces:
 * - All emitted data must carry a classification label
 * - Classification cannot exceed the plugin's declared ceiling
 * - All data read through the SDK carries classification metadata (auto-taint)
 * - Query operations are validated against declared capabilities
 *
 * @module
 */

import type { ClassificationLevel, Result } from "../core/types/classification.ts";
import { CLASSIFICATION_ORDER } from "../core/types/classification.ts";

/** A declared capability for a plugin, specifying what resources it can access. */
export interface PluginCapability {
  /** The type of capability (e.g., "database", "api", "file"). */
  readonly type: string;
  /** The resource identifier this capability grants access to (e.g., "contacts", "*"). */
  readonly resource: string;
  /** Permissions granted on the resource (e.g., ["read"], ["read", "write"]). */
  readonly permissions: readonly string[];
}

/**
 * Handler function for processing plugin queries.
 *
 * Receives the query string and plugin name, returns data with classification.
 */
export interface QueryHandler {
  (query: string, pluginName: string): Promise<{
    readonly data: unknown;
    readonly classification: ClassificationLevel;
  }>;
}

/** Configuration for creating a Plugin SDK instance. */
export interface PluginSdkConfig {
  /** Name of the plugin. */
  readonly pluginName: string;
  /** Maximum classification level the plugin is allowed to handle. */
  readonly maxClassification: ClassificationLevel;
  /** Declared capabilities for the plugin. When provided, queries are validated against these. */
  readonly capabilities?: readonly PluginCapability[];
  /** Optional handler for processing queries. When not provided, stub results are returned. */
  readonly queryHandler?: QueryHandler;
}

/** Data payload for emission from a plugin. */
export interface EmitDataPayload {
  /** The data content. */
  readonly content?: string;
  /** Classification label for the data. Required. */
  readonly classification?: ClassificationLevel;
}

/** Result of a query operation, carrying classification metadata. */
export interface QueryResult {
  /** The classification level of the returned data. */
  readonly classification: ClassificationLevel;
  /** The query result data. */
  readonly data: unknown;
}

/** Plugin SDK interface providing permission-aware methods. */
export interface PluginSdk {
  /** Emit data from the plugin. Requires a classification label. */
  emitData(payload: EmitDataPayload): Result<void, string>;
  /** Query data as the user. Returns data with classification metadata. */
  queryAsUser(query: string): Promise<QueryResult>;
  /**
   * Query data as the user with Result-based error handling.
   *
   * Validates the query against declared capabilities and delegates
   * to the query handler if provided. Returns a Result instead of throwing.
   */
  queryAsUserSafe(query: string): Promise<Result<QueryResult, string>>;
}

/**
 * Check whether a query target matches any declared capability.
 *
 * A capability matches if:
 * - Its resource is "*" (wildcard, matches everything)
 * - The query string contains the capability's resource name (case-insensitive)
 *
 * @param query - The query string to validate
 * @param capabilities - The declared capabilities to check against
 * @returns true if the query matches at least one capability
 */
function matchesCapability(
  query: string,
  capabilities: readonly PluginCapability[],
): boolean {
  const lowerQuery = query.toLowerCase();
  for (const cap of capabilities) {
    if (cap.resource === "*") {
      return true;
    }
    if (lowerQuery.includes(cap.resource.toLowerCase())) {
      return true;
    }
  }
  return false;
}

/**
 * Create a Plugin SDK instance with classification enforcement.
 *
 * @param config - Plugin SDK configuration
 * @returns A PluginSdk instance
 */
export function createPluginSdk(config: PluginSdkConfig): PluginSdk {
  const { pluginName, maxClassification, capabilities, queryHandler } = config;
  const ceilingOrder = CLASSIFICATION_ORDER[maxClassification];

  /**
   * Internal implementation of queryAsUser that returns a Result.
   * Used by both queryAsUser (throws on error) and queryAsUserSafe (returns Result).
   */
  async function queryAsUserInternal(
    query: string,
  ): Promise<Result<QueryResult, string>> {
    // Validate against declared capabilities if they are configured
    if (capabilities !== undefined) {
      if (!matchesCapability(query, capabilities)) {
        return {
          ok: false,
          error: `Plugin "${pluginName}": query target not covered by declared capabilities`,
        };
      }
    }

    // Delegate to query handler if provided
    if (queryHandler) {
      const handlerResult = await queryHandler(query, pluginName);
      const resultOrder = CLASSIFICATION_ORDER[handlerResult.classification];
      if (resultOrder > ceilingOrder) {
        return {
          ok: false,
          error: `Plugin "${pluginName}": query result classification "${handlerResult.classification}" exceeds ceiling "${maxClassification}"`,
        };
      }
      return {
        ok: true,
        value: {
          classification: handlerResult.classification,
          data: handlerResult.data,
        },
      };
    }

    // No handler provided: return stub result at the plugin's max classification
    return {
      ok: true,
      value: {
        classification: maxClassification,
        data: { query, rows: [] },
      },
    };
  }

  return {
    emitData(payload: EmitDataPayload): Result<void, string> {
      // Reject data without classification label
      if (!payload.classification) {
        return {
          ok: false,
          error: `Plugin "${pluginName}": emitData requires a classification label`,
        };
      }

      // Reject classification above the plugin's ceiling
      const payloadOrder = CLASSIFICATION_ORDER[payload.classification];
      if (payloadOrder > ceilingOrder) {
        return {
          ok: false,
          error: `Plugin "${pluginName}": classification "${payload.classification}" exceeds ceiling "${maxClassification}"`,
        };
      }

      return { ok: true, value: undefined };
    },

    async queryAsUser(query: string): Promise<QueryResult> {
      // Auto-taint: data read through SDK carries classification metadata
      const result = await queryAsUserInternal(query);
      if (!result.ok) {
        throw new Error(result.error);
      }
      return result.value;
    },

    // deno-lint-ignore require-await
    async queryAsUserSafe(
      query: string,
    ): Promise<Result<QueryResult, string>> {
      return queryAsUserInternal(query);
    },
  };
}
