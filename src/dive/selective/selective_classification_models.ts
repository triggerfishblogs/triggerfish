/**
 * Per-classification model reconfiguration for the selective wizard.
 *
 * Prompts the user to update per-classification model overrides,
 * preserving existing config where appropriate.
 *
 * @module
 */

import { promptClassificationModelsStep } from "../wizard/wizard_classification_models.ts";

/**
 * Reconfigure per-classification model overrides.
 *
 * Returns the updated classification_models config section,
 * or undefined if the user chose not to use per-classification models.
 */
export async function reconfigureClassificationModels(
  _existingConfig: Record<string, unknown>,
): Promise<Record<string, { provider: string; model: string }> | undefined> {
  const result = await promptClassificationModelsStep();
  if (!result.classificationModels) return undefined;

  const models: Record<string, { provider: string; model: string }> = {};
  for (const [level, entry] of Object.entries(result.classificationModels)) {
    if (!entry) continue;
    models[level] = { provider: entry.provider, model: entry.model };
  }
  return Object.keys(models).length > 0 ? models : undefined;
}
