/**
 * Per-classification model selection step for the dive wizard.
 *
 * Prompts the user to optionally configure different LLM providers
 * for CONFIDENTIAL and RESTRICTED classification levels.
 *
 * @module
 */

import { Confirm, Input, Select } from "@cliffy/prompt";

import type { ClassificationModelEntry, ProviderChoice } from "./wizard_types.ts";
import { DEFAULT_MODELS, PROVIDER_LABELS } from "./wizard_types.ts";

/** Result of the classification models wizard step. */
export interface ClassificationModelsResult {
  readonly classificationModels?: Readonly<
    Partial<Record<string, ClassificationModelEntry>>
  >;
}

/** Prompt the user to select a provider for a classification level. */
async function selectProviderForLevel(
  level: string,
): Promise<ClassificationModelEntry> {
  const provider = (await Select.prompt({
    message: `Provider for ${level}`,
    options: [
      { name: PROVIDER_LABELS.anthropic, value: "anthropic" },
      { name: PROVIDER_LABELS.google, value: "google" },
      { name: PROVIDER_LABELS.ollama, value: "ollama" },
      { name: PROVIDER_LABELS.lmstudio, value: "lmstudio" },
      { name: PROVIDER_LABELS.openai, value: "openai" },
      { name: PROVIDER_LABELS.openrouter, value: "openrouter" },
      { name: PROVIDER_LABELS.zai, value: "zai" },
      { name: PROVIDER_LABELS.zenmux, value: "zenmux" },
    ],
  })) as ProviderChoice;

  const model = await Input.prompt({
    message: `Model name for ${level}`,
    default: DEFAULT_MODELS[provider],
  });

  return { provider, model };
}

/** Prompt to configure per-classification models (optional wizard step). */
export async function promptClassificationModelsStep(): Promise<ClassificationModelsResult> {
  console.log("");
  console.log("  Per-Classification Model Configuration (optional)");
  console.log("");
  console.log("  You can route different classification levels to different models.");
  console.log("  For example, use a local model for CONFIDENTIAL/RESTRICTED data.");
  console.log("");

  const wantPerLevel = await Confirm.prompt({
    message: "Use different models for different classification levels?",
    default: false,
  });

  if (!wantPerLevel) {
    return {};
  }

  const models: Record<string, ClassificationModelEntry> = {};

  const configureConfidential = await Confirm.prompt({
    message: "Configure a different model for CONFIDENTIAL data?",
    default: true,
  });
  if (configureConfidential) {
    models["CONFIDENTIAL"] = await selectProviderForLevel("CONFIDENTIAL");
  }

  const configureRestricted = await Confirm.prompt({
    message: "Configure a different model for RESTRICTED data?",
    default: true,
  });
  if (configureRestricted) {
    models["RESTRICTED"] = await selectProviderForLevel("RESTRICTED");
  }

  if (Object.keys(models).length === 0) {
    return {};
  }

  return { classificationModels: models };
}
