/**
 * Interactive prompt for Signal channel configuration.
 * Handles signal-cli binary resolution, device linking, daemon lifecycle, and policy.
 * @module
 */

import { Confirm, Input, Select } from "@cliffy/prompt";
import {
  checkSignalCli,
  downloadSignalCli,
  fetchLatestVersion,
  isDaemonRunning,
  renderQrCode,
  startDaemon,
  startLinkProcess,
  waitForDaemon,
} from "../../../channels/signal/setup/setup.ts";
import { createLogger } from "../../../core/logger/mod.ts";

const log = createLogger("cli.signal");

/** Result of resolving the signal-cli binary location. */
interface SignalCliBinary {
  readonly path: string;
  readonly javaHome: string | undefined;
}

const SIGNAL_TCP_HOST = "localhost";
const SIGNAL_TCP_PORT = 7583;

/** Locate signal-cli on the system or download it interactively. */
async function resolveSignalCliBinary(): Promise<SignalCliBinary> {
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
  const releaseResult = await fetchLatestVersion();
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

/** Initiate the link process and display the QR code. */
async function initiateDeviceLink(
  binary: SignalCliBinary,
): Promise<
  { uri: string; process: { status: Promise<{ success: boolean }> } }
> {
  const linkResult = await startLinkProcess(
    "Triggerfish",
    binary.path,
    binary.javaHome,
  );

  if (!linkResult.ok) {
    log.error("Signal device link failed", {
      operation: "linkDevice",
      error: linkResult.error,
    });
    console.error(`  Link failed: ${linkResult.error}`);
    console.error(
      `  You can link manually: ${binary.path} link -n Triggerfish`,
    );
    Deno.exit(1);
  }

  await renderQrCode(linkResult.value.uri);
  console.log("Scan this QR code with Signal on your phone.");
  console.log("Waiting for link to complete...\n");
  return linkResult.value;
}

/** Run the device-link flow: display QR code and wait for completion. */
async function linkSignalDevice(binary: SignalCliBinary): Promise<void> {
  console.log("\nStarting device link...");
  console.log(
    "Open Signal on your phone: Settings > Linked Devices > Link New Device\n",
  );

  const link = await initiateDeviceLink(binary);
  const linkStatus = await link.process.status;
  if (!linkStatus.success) {
    log.error("Signal device linking process failed", {
      operation: "linkDevice",
    });
    console.error("  Device linking failed. Check signal-cli output.");
    Deno.exit(1);
  }
  console.log("  Device linked successfully!\n");
}

/** Start the signal-cli daemon or report that it is already running. */
async function ensureSignalDaemon(
  account: string,
  binary: SignalCliBinary,
): Promise<void> {
  const alreadyRunning = await isDaemonRunning(
    SIGNAL_TCP_HOST,
    SIGNAL_TCP_PORT,
  );
  if (alreadyRunning) {
    console.log(
      `  signal-cli daemon already running on ${SIGNAL_TCP_HOST}:${SIGNAL_TCP_PORT}`,
    );
    return;
  }

  const startIt = await Confirm.prompt({
    message:
      `Start signal-cli daemon on tcp://${SIGNAL_TCP_HOST}:${SIGNAL_TCP_PORT}?`,
    default: true,
  });

  if (!startIt) {
    printManualDaemonInstructions(account, binary.path);
    return;
  }

  await spawnSignalDaemon(account, binary);
}

/** Print instructions for manually starting the daemon. */
function printManualDaemonInstructions(
  account: string,
  binaryPath: string,
): void {
  console.log("\n  Start it manually before running Triggerfish:");
  console.log(
    `  ${binaryPath} -a ${account} daemon --tcp ${SIGNAL_TCP_HOST}:${SIGNAL_TCP_PORT}\n`,
  );
}

/** Spawn the signal-cli daemon process and verify readiness. */
async function spawnSignalDaemon(
  account: string,
  binary: SignalCliBinary,
): Promise<void> {
  console.log("  Starting signal-cli daemon...");
  const daemonResult = startDaemon(
    account,
    SIGNAL_TCP_HOST,
    SIGNAL_TCP_PORT,
    binary.path,
    binary.javaHome,
  );

  if (!daemonResult.ok) {
    printDaemonStartError(daemonResult.error, account, binary.path);
    return;
  }

  const ready = await waitForDaemon(SIGNAL_TCP_HOST, SIGNAL_TCP_PORT);
  if (ready) {
    console.log("  Daemon is running.");
    return;
  }

  await reportDaemonStartupFailure(daemonResult.value, account, binary.path);
}

/** Print a daemon start failure message with manual command hint. */
function printDaemonStartError(
  error: string,
  account: string,
  binaryPath: string,
): void {
  log.error("Signal daemon start failed", {
    operation: "startSignalDaemon",
    error,
  });
  console.error(`  Failed: ${error}`);
  console.error(
    `  Start manually: ${binaryPath} -a ${account} daemon --tcp localhost:7583`,
  );
}

/** Report daemon startup failure with stderr output. */
async function reportDaemonStartupFailure(
  daemonHandle: { stderrText: () => Promise<string> },
  account: string,
  binaryPath: string,
): Promise<void> {
  const stderr = await daemonHandle.stderrText();
  log.warn("Signal daemon started but not reachable", {
    operation: "startSignalDaemon",
    stderr: stderr || "(empty)",
  });
  console.error(
    "  Daemon started but not reachable yet. It may still be initializing.",
  );
  if (stderr) {
    console.error(`  signal-cli stderr: ${stderr}`);
  }
  console.error(
    `  Check: ${binaryPath} -a ${account} daemon --tcp localhost:7583`,
  );
}

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

/** Prompt for device setup mode and run linking if selected. */
async function promptDeviceSetup(binary: SignalCliBinary): Promise<void> {
  const setupMode = await Select.prompt({
    message: "Device setup",
    options: [
      {
        name: "Link to existing Signal account (scan QR with phone)",
        value: "link",
      },
      { name: "Already linked / manual setup", value: "skip" },
    ],
    default: "link",
  });

  if (setupMode === "link") {
    await linkSignalDevice(binary);
  }
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
