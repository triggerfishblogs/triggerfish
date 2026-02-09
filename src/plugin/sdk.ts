/**
 * Plugin SDK providing permission-aware methods for plugins.
 *
 * The SDK enforces:
 * - All emitted data must carry a classification label
 * - Classification cannot exceed the plugin's declared ceiling
 * - All data read through the SDK carries classification metadata (auto-taint)
 *
 * @module
 */

import type { ClassificationLevel, Result } from "../core/types/classification.ts";
import { CLASSIFICATION_ORDER } from "../core/types/classification.ts";

/** Configuration for creating a Plugin SDK instance. */
export interface PluginSdkConfig {
  /** Name of the plugin. */
  readonly pluginName: string;
  /** Maximum classification level the plugin is allowed to handle. */
  readonly maxClassification: ClassificationLevel;
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
}

/**
 * Create a Plugin SDK instance with classification enforcement.
 *
 * @param config - Plugin SDK configuration
 * @returns A PluginSdk instance
 */
export function createPluginSdk(config: PluginSdkConfig): PluginSdk {
  const { pluginName, maxClassification } = config;
  const ceilingOrder = CLASSIFICATION_ORDER[maxClassification];

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
      // In a real implementation, this would execute the query against the
      // user's data source and classify the response.
      // For now, return a stub result at the plugin's max classification.
      return {
        classification: maxClassification,
        data: { query, rows: [] },
      };
    },
  };
}
