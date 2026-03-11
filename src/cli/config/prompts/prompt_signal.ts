/**
 * Interactive prompt for Signal channel configuration.
 *
 * Orchestrates binary resolution, device linking, daemon lifecycle,
 * pairing, group mode, and classification prompts.
 * @module
 */

import { Confirm, Input, Select } from "@cliffy/prompt";
import { resolveSignalCliBinary } from "./prompt_signal_binary.ts";
import {
  ensureSignalDaemon,
  promptDeviceSetup,
  SIGNAL_TCP_HOST,
  SIGNAL_TCP_PORT,
} from "./prompt_signal_daemon.ts";

/** Print pairing mode instructions when enabled. */
function printPairingInstructions(): void {
  console.log(
    "\n  Pairing mode: new contacts must send a 6-digit code to start chatting.",
  );
  console.log(
    '  Generate codes at runtime: ask your agent "generate a pairing code for Signal"',
  );
  console.log("  Codes expire after 5 minutes and can only be used once.\n");
}

/** Prompt for Signal pairing mode toggle. */
async function promptSignalPairing(): Promise<Record<string, unknown>> {
  const enablePairing = await Confirm.prompt({
    message:
      "Enable pairing mode? (new contacts must send a one-time code before chatting)",
    default: false,
  });

  if (!enablePairing) return {};

  printPairingInstructions();
  return { pairing: true };
}

/** Prompt for Signal group mode and classification. */
async function promptSignalGroupAndClassification(): Promise<
  Record<string, unknown>
> {
  const defaultGroupMode = await Select.prompt({
    message: "Default group chat mode",
    options: [
      { name: "Always respond", value: "always" },
      { name: "Only when mentioned", value: "mentioned-only" },
      { name: "Owner-only commands", value: "owner-only" },
    ],
    default: "always",
  });

  const classification = await Select.prompt({
    message: "Classification level",
    options: ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"],
    default: "PUBLIC",
  });

  return { defaultGroupMode, classification };
}

/** Prompt for full Signal channel configuration: binary, linking, daemon, policy. */
export async function promptSignalConfig(): Promise<Record<string, unknown>> {
  const binary = await resolveSignalCliBinary();

  const account = await Input.prompt({
    message: "Your Signal phone number (E.164 format, e.g. +15551234567)",
  });

  await promptDeviceSetup(binary);
  await ensureSignalDaemon(account, binary);

  const pairingConfig = await promptSignalPairing();
  const groupConfig = await promptSignalGroupAndClassification();

  return {
    account,
    endpoint: `tcp://${SIGNAL_TCP_HOST}:${SIGNAL_TCP_PORT}`,
    ...pairingConfig,
    ...groupConfig,
  };
}
