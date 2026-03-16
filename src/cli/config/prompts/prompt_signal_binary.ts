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
  log.info("Checking for signal-cli on system", {
    operation: "resolveSignalCliBinary",
  });
  const cliCheck = await checkSignalCli();

  if (cliCheck.ok) {
    log.info("Signal CLI found", {
      operation: "resolveSignalCliBinary",
      version: cliCheck.value.version,
      path: cliCheck.value.path,
    });
    return { path: cliCheck.value.path, javaHome: cliCheck.value.javaHome };
  }

  return await promptSignalCliInstall();
}

/** Offer to download signal-cli when not found on the system. */
async function promptSignalCliInstall(): Promise<SignalCliBinary> {
  log.warn("Signal CLI not found on PATH or in ~/.triggerfish/bin/", {
    operation: "promptSignalCliInstall",
  });
  const installIt = await Confirm.prompt({
    message: "Download and install signal-cli?",
    default: true,
  });

  if (!installIt) {
    log.warn("Signal CLI install declined, exiting", {
      operation: "promptSignalCliInstall",
    });
    Deno.exit(1);
  }

  return await fetchAndInstallSignalCli();
}

/** Fetch the latest release and install signal-cli. */
async function fetchAndInstallSignalCli(): Promise<SignalCliBinary> {
  log.info("Fetching latest Signal CLI release info", {
    operation: "fetchAndInstallSignalCli",
  });
  const releaseResult = await fetchKnownGoodRelease();
  if (!releaseResult.ok) {
    log.error("Signal CLI release fetch failed", {
      operation: "fetchAndInstallSignalCli",
      err: releaseResult.error,
    });
    Deno.exit(1);
  }

  const installResult = await downloadSignalCli(releaseResult.value);
  if (!installResult.ok) {
    log.error("Signal CLI installation failed", {
      operation: "fetchAndInstallSignalCli",
      err: installResult.error,
    });
    Deno.exit(1);
  }

  return {
    path: installResult.value.path,
    javaHome: installResult.value.javaHome,
  };
}
