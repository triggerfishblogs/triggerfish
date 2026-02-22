/**
 * Channel adapter wiring for gateway startup.
 *
 * Extracts Telegram, Discord, and Signal channel setup into
 * parameterized helpers to keep the main startup flow readable.
 *
 * @module
 */

import type { ClassificationLevel } from "../../core/types/classification.ts";
import type { UserId } from "../../core/types/session.ts";
import { createTelegramChannel } from "../../channels/telegram/adapter.ts";
import { createDiscordChannel } from "../../channels/discord/adapter.ts";
import { createSignalChannel } from "../../channels/signal/adapter.ts";
import {
  checkSignalCli,
  isDaemonHealthy,
  isDaemonRunning,
  isDaemonRunningUnix,
  startDaemon,
  startDaemonUnix,
  waitForDaemon,
  waitForDaemonUnix,
} from "../../channels/signal/setup.ts";
import type { DaemonHandle } from "../../channels/signal/setup.ts";
import { buildSendEvent } from "../chat.ts";
import type { ChatSession } from "../chat.ts";
import type { RegisteredChannel } from "../tools/session_tools.ts";
import type { NotificationService } from "../notifications/notifications.ts";
import { createLogger } from "../../core/logger/mod.ts";

const log = createLogger("startup-channels");

/** Shared dependencies for channel wiring. */
export interface ChannelWiringDeps {
  readonly chatSession: ChatSession;
  readonly notificationService: NotificationService;
  readonly channelAdapters: Map<string, RegisteredChannel>;
}

// ─── Telegram ────────────────────────────────────────────────────────────────

/** Telegram channel config from triggerfish.yaml. */
export interface TelegramChannelConfig {
  readonly botToken?: string;
  readonly ownerId?: number;
  readonly classification?: string;
  readonly user_classifications?: Record<string, string>;
  readonly respond_to_unclassified?: boolean;
}

/** Wire and connect Telegram channel adapter. */
export async function wireTelegramChannel(
  telegramConfig: TelegramChannelConfig,
  deps: ChannelWiringDeps,
): Promise<void> {
  if (!telegramConfig.botToken) return;

  const { chatSession, notificationService, channelAdapters } = deps;
  const classification = (telegramConfig.classification ?? "PUBLIC") as ClassificationLevel;

  const telegramAdapter = createTelegramChannel({
    botToken: telegramConfig.botToken,
    ownerId: telegramConfig.ownerId,
    classification,
  });

  await chatSession.registerChannel("telegram", {
    adapter: telegramAdapter,
    channelName: "Telegram",
    classification,
    userClassifications: telegramConfig.user_classifications,
    respondToUnclassified: telegramConfig.respond_to_unclassified,
  });

  telegramAdapter.onMessage((msg) => {
    // Handle /start — greet the user on first contact
    if (msg.content === "/start") {
      telegramAdapter.send({
        content: "Triggerfish connected. You can chat with me here.",
        sessionId: msg.sessionId,
      }).catch((err) => log.error("Telegram /start greeting send failed", err));
      return;
    }

    // /clear must call chatSession.clear() — same as the CLI/gateway path.
    if (msg.content === "/clear" && msg.isOwner !== false) {
      chatSession.clear();
      telegramAdapter.clearChat(msg.sessionId ?? "")
        .then(() =>
          telegramAdapter.send({
            content:
              "Session cleared. Your context and taint level have been reset to PUBLIC.\n\nWhat would you like to do?",
            sessionId: msg.sessionId,
          })
        )
        .then(() => notificationService.flushPending("owner" as UserId))
        .catch((err) => log.error("Telegram /clear session reset failed", err));
      return;
    }

    if (msg.isOwner !== false) {
      const sendEvent = buildSendEvent(telegramAdapter, "Telegram", msg);
      chatSession.executeAgentTurn(msg.content, sendEvent)
        .catch((err) => log.error("Telegram owner executeAgentTurn failed", err));
    } else {
      chatSession.handleChannelMessage(msg, "telegram")
        .catch((err) => log.error("Telegram external handleChannelMessage failed", err));
    }
  });

  // Register Telegram for notification delivery
  const ownerChatId = telegramConfig.ownerId
    ? `telegram-${telegramConfig.ownerId}`
    : undefined;
  if (ownerChatId) {
    notificationService.registerChannel({
      name: "telegram",
      send: (msg) =>
        telegramAdapter.send({ content: msg, sessionId: ownerChatId }),
    });
  }

  await telegramAdapter.connect();

  channelAdapters.set("telegram", {
    adapter: telegramAdapter,
    classification,
    name: "Telegram",
  });

  log.info("Telegram channel connected");
}

// ─── Discord ─────────────────────────────────────────────────────────────────

/** Discord channel config from triggerfish.yaml. */
export interface DiscordChannelConfig {
  readonly botToken?: string;
  readonly ownerId?: string;
  readonly classification?: string;
  readonly user_classifications?: Record<string, string>;
  readonly respond_to_unclassified?: boolean;
}

/** Wire and connect Discord channel adapter. */
export async function wireDiscordChannel(
  discordConfig: DiscordChannelConfig,
  deps: ChannelWiringDeps,
): Promise<void> {
  if (!discordConfig.botToken) {
    log.warn("Discord channel configured but botToken is missing or empty");
    return;
  }

  const { chatSession, notificationService, channelAdapters } = deps;
  const classification = (discordConfig.classification ?? "PUBLIC") as ClassificationLevel;

  log.info("Discord channel configured, connecting...");
  try {
    const discordAdapter = createDiscordChannel({
      botToken: discordConfig.botToken,
      ownerId: discordConfig.ownerId,
      classification,
    });

    await chatSession.registerChannel("discord", {
      adapter: discordAdapter,
      channelName: "Discord",
      classification,
      userClassifications: discordConfig.user_classifications,
      respondToUnclassified: discordConfig.respond_to_unclassified,
    });

    discordAdapter.onMessage((msg) => {
      if (msg.content === "/clear" && msg.isOwner !== false) {
        chatSession.clear();
        discordAdapter.send({
          content:
            "Session cleared. Your context and taint level have been reset to PUBLIC.\n\nWhat would you like to do?",
          sessionId: msg.sessionId,
        }).then(() => notificationService.flushPending("owner" as UserId))
          .catch((err) => log.error("Discord /clear session reset send failed", err));
        return;
      }

      if (msg.isOwner !== false) {
        const sendEvent = buildSendEvent(discordAdapter, "Discord", msg);
        chatSession.executeAgentTurn(msg.content, sendEvent)
          .catch((err) => log.error("Discord owner executeAgentTurn failed", err));
      } else {
        chatSession.handleChannelMessage(msg, "discord")
          .catch((err) => log.error("Discord external handleChannelMessage failed", err));
      }
    });

    await discordAdapter.connect();

    channelAdapters.set("discord", {
      adapter: discordAdapter,
      classification,
      name: "Discord",
    });

    log.info("Discord channel connected");
  } catch (err) {
    log.error("Discord channel failed to connect:", err);
  }
}

// ─── Signal ──────────────────────────────────────────────────────────────────

/** Signal channel config from triggerfish.yaml. */
export interface SignalChannelConfig {
  readonly endpoint?: string;
  readonly account?: string;
  readonly ownerPhone?: string;
  readonly pairing?: boolean;
  readonly pairing_classification?: string;
  readonly classification?: string;
  readonly defaultGroupMode?: string;
  readonly user_classifications?: Record<string, string>;
  readonly respond_to_unclassified?: boolean;
  readonly groups?: Record<string, { mode: string; classification?: string }>;
}

/** Mutable handle for the spawned signal-cli daemon child. */
export interface SignalDaemonState {
  handle: DaemonHandle | null;
}

/** Start signal-cli TCP daemon if not already running. */
async function ensureTcpDaemon(
  tcpHost: string,
  tcpPort: number,
  account: string,
  state: SignalDaemonState,
): Promise<void> {
  const running = await isDaemonRunning(tcpHost, tcpPort);
  const healthy = running ? await isDaemonHealthy(tcpHost, tcpPort) : false;

  if (!running || !healthy) {
    if (running && !healthy) {
      log.warn("signal-cli daemon is occupying the port but not responding to JSON-RPC");
      if (state.handle) {
        try { state.handle.child.kill("SIGTERM"); } catch { /* already dead */ }
        state.handle = null;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    log.info("signal-cli daemon not running, starting...");
    const cliCheck = await checkSignalCli();
    if (cliCheck.ok) {
      const daemonResult = startDaemon(
        account,
        tcpHost,
        tcpPort,
        cliCheck.value.path,
        cliCheck.value.javaHome,
      );
      if (daemonResult.ok) {
        state.handle = daemonResult.value;
        const ready = await waitForDaemon(tcpHost, tcpPort);
        if (ready) {
          log.info("signal-cli daemon started");
          const versionCheck = await checkSignalCli();
          if (versionCheck.ok) {
            log.info(`signal-cli version: ${versionCheck.value.version}`);
          }
        } else {
          const earlyErr = await daemonResult.value.earlyStderr;
          if (earlyErr) log.error(`signal-cli early stderr: ${earlyErr}`);
          const stderr = await daemonResult.value.stderrText();
          log.error("signal-cli daemon started but not reachable within 60s");
          if (stderr) log.error(`signal-cli stderr: ${stderr}`);
        }
      } else {
        log.error(`Failed to start signal-cli daemon: ${daemonResult.error}`);
      }
    } else {
      log.error("signal-cli not found — cannot auto-start daemon");
    }
  }
}

/** Start signal-cli Unix socket daemon if not already running. */
async function ensureUnixDaemon(
  socketPath: string,
  account: string,
  state: SignalDaemonState,
): Promise<void> {
  const running = await isDaemonRunningUnix(socketPath);
  if (!running) {
    log.info("signal-cli daemon not running (Unix socket), starting...");
    const cliCheck = await checkSignalCli();
    if (cliCheck.ok) {
      const daemonResult = startDaemonUnix(
        account,
        socketPath,
        cliCheck.value.path,
        cliCheck.value.javaHome,
      );
      if (daemonResult.ok) {
        state.handle = daemonResult.value;
        const ready = await waitForDaemonUnix(socketPath);
        if (ready) {
          log.info("signal-cli daemon started (Unix socket)");
          const versionCheck = await checkSignalCli();
          if (versionCheck.ok) {
            log.info(`signal-cli version: ${versionCheck.value.version}`);
          }
        } else {
          const earlyErr = await daemonResult.value.earlyStderr;
          if (earlyErr) log.error(`signal-cli early stderr: ${earlyErr}`);
          const stderr = await daemonResult.value.stderrText();
          log.error("signal-cli daemon (Unix socket) not reachable within 60s");
          if (stderr) log.error(`signal-cli stderr: ${stderr}`);
        }
      } else {
        log.error(`Failed to start signal-cli daemon: ${daemonResult.error}`);
      }
    } else {
      log.error("signal-cli not found — cannot auto-start daemon");
    }
  }
}

/**
 * Wire and connect Signal channel adapter (runs in background).
 *
 * Returns the mutable daemon state so the caller can kill the daemon on shutdown.
 */
export function wireSignalChannel(
  signalConfig: SignalChannelConfig,
  deps: ChannelWiringDeps,
): SignalDaemonState {
  const state: SignalDaemonState = { handle: null };

  if (!signalConfig.endpoint || !signalConfig.account) return state;

  const { chatSession, notificationService, channelAdapters } = deps;
  const signalEndpoint = signalConfig.endpoint;
  const signalAccount = signalConfig.account;
  const signalOwnerPhone = signalConfig.ownerPhone;
  const signalClassification = (signalConfig.classification ?? "PUBLIC") as ClassificationLevel;
  const signalDefaultGroupMode = (signalConfig.defaultGroupMode ?? "always") as
    | "always"
    | "mentioned-only"
    | "owner-only";
  const signalGroups = signalConfig.groups as
    | Record<
      string,
      {
        readonly mode: "always" | "mentioned-only" | "owner-only";
        readonly classification?: ClassificationLevel;
      }
    >
    | undefined;
  const signalPairing = signalConfig.pairing;
  const signalPairingClassification = (signalConfig.pairing_classification ??
    "INTERNAL") as ClassificationLevel;

  log.info("Signal channel setup starting (background)...");

  (async () => {
    try {
      const tcpMatch = signalEndpoint.match(/^tcp:\/\/([^:]+):(\d+)$/);
      const unixMatch = signalEndpoint.match(/^unix:\/\/(.+)$/);

      if (tcpMatch) {
        const [, tcpHost, tcpPortStr] = tcpMatch;
        await ensureTcpDaemon(tcpHost, parseInt(tcpPortStr, 10), signalAccount, state);
      } else if (unixMatch) {
        await ensureUnixDaemon(unixMatch[1], signalAccount, state);
      }

      const signalAdapter = createSignalChannel({
        endpoint: signalEndpoint,
        account: signalAccount,
        ownerPhone: signalOwnerPhone,
        classification: signalClassification,
        defaultGroupMode: signalDefaultGroupMode,
        groups: signalGroups,
      });

      await chatSession.registerChannel("signal", {
        adapter: signalAdapter,
        channelName: "Signal",
        classification: signalClassification,
        userClassifications: signalConfig.user_classifications,
        respondToUnclassified: signalConfig.respond_to_unclassified,
        pairing: signalPairing,
        pairingClassification: signalPairingClassification,
      });

      signalAdapter.onMessage((msg) => {
        chatSession.handleChannelMessage(msg, "signal")
          .catch((err) => log.error("Signal handleChannelMessage failed", err));
      });

      if (signalOwnerPhone) {
        notificationService.registerChannel({
          name: "signal",
          send: (notifMsg) =>
            signalAdapter.send({
              content: notifMsg,
              sessionId: `signal-${signalOwnerPhone}`,
            }),
        });
      }

      await signalAdapter.connect();

      channelAdapters.set("signal", {
        adapter: signalAdapter,
        classification: signalClassification,
        name: "Signal",
      });

      log.info("Signal channel connected");
    } catch (err) {
      log.error(
        `Signal channel failed to connect: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  })();

  return state;
}
