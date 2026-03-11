/**
 * Signal CLI binary resolution and installation prompts.
 *
 * Locates signal-cli on the system or offers to download it interactively.
 * @module
 */

import { Confirm } from "@cliffy/prompt";
import {
  checkSignalCli,
  downloadSignalCli,
  fetchKnownGoodRelease,
} from "../../../channels/signal/setup/setup.ts";
import { createLogger } from "../../../core/logger/mod.ts";

const log = createLogger("cli.signal");

/** Result of resolving the signal-cli binary location. */
export interface SignalCliBinary {
  readonly path: string;
  readonly javaHome: string | undefined;
}

/** Locate signal-cli on the system or download it interactively. */
export async function resolveSignalCliBinary(): Promise<SignalCliBinary> {
  console.log("\nChecking for signal-cli...");
  const cliCheck = await checkSignalCli();

  if (cliCheck.ok) {
    console.log(`  Found: ${cliCheck.value.version} (${cliCheck.value.path})`);
    return { path: cliCheck.value.path, javaHome: cliCheck.value.javaHome };
  }

  return await promptSignalCliInstall();
}

/** Offer to download signal-cli when not found on the system. */
async function promptSignalCliInstall(): Promise<SignalCliBinary> {
  console.log("  signal-cli not found on PATH or in ~/.triggerfish/bin/\n");
  const installIt = await Confirm.prompt({
    message: "Download and install signal-cli?",
    default: true,
  });

  if (!installIt) {
    console.error("\n  Install signal-cli manually before continuing:");
    console.error("    https://github.com/AsamK/signal-cli/releases\n");
    Deno.exit(1);
  }

  return await fetchAndInstallSignalCli();
}

/** Fetch the latest release and install signal-cli. */
async function fetchAndInstallSignalCli(): Promise<SignalCliBinary> {
  console.log("\n  Fetching latest release info...");
  const releaseResult = await fetchKnownGoodRelease();
  if (!releaseResult.ok) {
    log.error("Signal CLI release fetch failed", {
      operation: "fetchSignalCli",
      error: releaseResult.error,
    });
    console.error(`  Failed: ${releaseResult.error}`);
    Deno.exit(1);
  }

  const installResult = await downloadSignalCli(releaseResult.value);
  if (!installResult.ok) {
    log.error("Signal CLI installation failed", {
      operation: "installSignalCli",
      error: installResult.error,
    });
    console.error(`  Installation failed: ${installResult.error}`);
    Deno.exit(1);
  }

  return {
    path: installResult.value.path,
    javaHome: installResult.value.javaHome,
  };
}
