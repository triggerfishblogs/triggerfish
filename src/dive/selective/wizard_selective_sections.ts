/**
 * Individual section dispatchers for the selective reconfiguration wizard.
 *
 * Each function applies one user-selected reconfiguration section,
 * mutating the shared wizard state.
 *
 * @module
 */

import { Confirm } from "@cliffy/prompt";

import { reconfigureLlmProvider } from "./selective_llm.ts";
import { reconfigureAgentIdentity } from "./selective_identity.ts";
import { reconfigureChannels } from "./selective_channels.ts";
import { reconfigurePlugins } from "./selective_plugins.ts";
import { reconfigureSearchProvider } from "./selective_search.ts";
import { reconfigureClassificationModels } from "./selective_classification_models.ts";

import type { WizardSection } from "../wizard/wizard_types.ts";

// ── Mutable reconfiguration state ─────────────────────────────────────────────

/** Accumulated state during selective reconfiguration. */
export interface SelectiveWizardState {
  readonly sections: WizardSection[];
  config: Record<string, unknown>;
  readonly existingConfig: Record<string, unknown>;
  readonly existingSpine: string;
  readonly spinePath: string;
  activeChannels: string[];
  installDaemon: boolean;
}

// ── Individual section dispatchers ────────────────────────────────────────────

/** Apply the LLM provider reconfiguration if selected. */
async function applyLlmSection(state: SelectiveWizardState): Promise<void> {
  if (!state.sections.includes("llm")) return;
  state.config["models"] = await reconfigureLlmProvider(state.existingConfig);
}

/** Apply the classification models reconfiguration if selected. */
async function applyClassificationModelsSection(
  state: SelectiveWizardState,
): Promise<void> {
  if (!state.sections.includes("classification_models")) return;
  const models = state.config["models"] as Record<string, unknown> | undefined;
  if (!models) return;
  const result = await reconfigureClassificationModels(state.existingConfig);
  if (result) {
    models["classification_models"] = result;
  } else {
    delete models["classification_models"];
  }
}

/** Apply the agent identity reconfiguration if selected. */
async function applyAgentSection(state: SelectiveWizardState): Promise<void> {
  if (!state.sections.includes("agent")) return;
  await reconfigureAgentIdentity(state.existingSpine, state.spinePath);
}

/** Apply the channel reconfiguration if selected. */
async function applyChannelsSection(
  state: SelectiveWizardState,
): Promise<void> {
  if (!state.sections.includes("channels")) return;
  state.config["channels"] = await reconfigureChannels(
    state.existingConfig,
    state.activeChannels,
  );
}

/** Apply the plugin reconfiguration if selected. */
async function applyPluginsSection(state: SelectiveWizardState): Promise<void> {
  if (!state.sections.includes("plugins")) return;
  const pluginsResult = await reconfigurePlugins(state.existingConfig);
  if (pluginsResult) {
    state.config["plugins"] = pluginsResult;
  } else {
    delete state.config["plugins"];
  }
}

/** Prompt for Google Workspace reconnection if selected. */
async function applyGoogleSection(state: SelectiveWizardState): Promise<void> {
  if (!state.sections.includes("google")) return;
  console.log("");
  console.log("  Google Workspace");
  console.log("");
  const connect = await Confirm.prompt({
    message: "Connect a Google account?",
    default: false,
  });
  console.log(
    connect ? "\n  Run: triggerfish connect google" : "  \u2192 Skipped.",
  );
}

/** Prompt for GitHub reconnection if selected. */
async function applyGitHubSection(state: SelectiveWizardState): Promise<void> {
  if (!state.sections.includes("github")) return;
  console.log("");
  console.log("  GitHub");
  console.log("");
  const connect = await Confirm.prompt({
    message: "Connect a GitHub account?",
    default: false,
  });
  console.log(
    connect ? "\n  Run: triggerfish connect github" : "  \u2192 Skipped.",
  );
}

/** Apply the search provider reconfiguration if selected. */
async function applySearchSection(state: SelectiveWizardState): Promise<void> {
  if (!state.sections.includes("search")) return;
  const webResult = await reconfigureSearchProvider(state.existingConfig);
  if (webResult) {
    state.config["web"] = webResult;
  } else {
    delete state.config["web"];
  }
}

/** Apply the daemon settings reconfiguration if selected. */
async function applyDaemonSection(state: SelectiveWizardState): Promise<void> {
  if (!state.sections.includes("daemon")) return;
  console.log("");
  console.log("  Daemon Settings");
  console.log("");
  state.installDaemon = await Confirm.prompt({
    message: "Start on login and run in background?",
    default: true,
  });
}

// ── Section dispatch ──────────────────────────────────────────────────────────

/** Apply all user-selected section reconfigurations sequentially. */
export async function applyAllSections(
  state: SelectiveWizardState,
): Promise<void> {
  await applyLlmSection(state);
  await applyClassificationModelsSection(state);
  await applyAgentSection(state);
  await applyChannelsSection(state);
  await applyPluginsSection(state);
  await applyGoogleSection(state);
  await applyGitHubSection(state);
  await applySearchSection(state);
  await applyDaemonSection(state);
}
