/**
 * Interactive prompts for configuring channels and plugins.
 * @module
 */

import { join } from "@std/path";
import { Confirm, Input, Select } from "@cliffy/prompt";
import { expandTilde } from "./paths.ts";
import {
  checkSignalCli,
  downloadSignalCli,
  fetchLatestVersion,
  isDaemonRunning,
  renderQrCode,
  startDaemon,
  startLinkProcess,
  waitForDaemon,
} from "../channels/signal/setup.ts";

import type { CHANNEL_TYPES, PLUGIN_TYPES } from "./config.ts";

type ChannelType = typeof CHANNEL_TYPES[number];
type PluginType = typeof PLUGIN_TYPES[number];

/** Prompt for channel-specific config fields and return the config object. */
export async function promptChannelConfig(
  channelType: ChannelType,
): Promise<Record<string, unknown>> {
  const config: Record<string, unknown> = {};

  switch (channelType) {
    case "telegram": {
      config.botToken = await Input.prompt({
        message: "Bot token (from @BotFather)",
      });
      const ownerId = await Input.prompt({
        message:
          "Your Telegram user ID (numeric, message @getmyid_bot for your ID number)",
      });
      config.ownerId = parseInt(ownerId, 10) || 0;
      config.classification = await Select.prompt({
        message: "Classification level",
        options: ["INTERNAL", "PUBLIC", "CONFIDENTIAL", "RESTRICTED"],
        default: "INTERNAL",
      });

      break;
    }

    case "slack": {
      config.botToken = await Input.prompt({
        message: "Bot token (xoxb-...)",
      });
      config.appToken = await Input.prompt({
        message: "App token (xapp-... for Socket Mode)",
      });
      config.signingSecret = await Input.prompt({
        message: "Signing secret",
      });
      const slackOwner = await Input.prompt({
        message: "Your Slack user ID (optional, e.g. U012ABC3DEF)",
        default: "",
      });
      if (slackOwner.length > 0) {
        config.ownerId = slackOwner;
      }
      config.classification = await Select.prompt({
        message: "Classification level",
        options: ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"],
        default: "PUBLIC",
      });
      break;
    }

    case "discord": {
      console.log("\n  To set up a Discord bot:\n");
      console.log("    1. Go to https://discord.com/developers/applications");
      console.log('    2. Click "New Application" \u2192 name it (e.g. "Triggerfish")');
      console.log("    3. Go to Bot in the sidebar \u2192 Reset Token \u2192 copy the token");
      console.log("    4. Enable these Privileged Gateway Intents on the Bot page:");
      console.log("       - Message Content Intent (required to read messages)");
      console.log("       - Server Members Intent (optional, for member lookup)");
      console.log("    5. Go to OAuth2 \u2192 URL Generator \u2192 select 'bot' scope");
      console.log("       Under Bot Permissions, select:");
      console.log("       - Send Messages");
      console.log("       - Read Message History");
      console.log("       - View Channels");
      console.log("    6. Copy the generated URL \u2192 open in browser \u2192 invite bot to your server");
      console.log("");
      console.log("  To find your Discord user ID:");
      console.log("    Settings \u2192 Advanced \u2192 enable Developer Mode");
      console.log("    Then click your username \u2192 Copy User ID\n");

      config.botToken = await Input.prompt({
        message: "Bot token",
      });
      const discordOwner = await Input.prompt({
        message: "Your Discord user ID (optional, snowflake)",
        default: "",
      });
      if (discordOwner.length > 0) {
        config.ownerId = discordOwner;
      }
      config.classification = await Select.prompt({
        message: "Classification level",
        options: ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"],
        default: "PUBLIC",
      });
      break;
    }

    case "whatsapp": {
      config.accessToken = await Input.prompt({
        message: "Meta Business API access token",
      });
      config.phoneNumberId = await Input.prompt({
        message: "Phone number ID",
      });
      config.verifyToken = await Input.prompt({
        message: "Webhook verify token",
      });
      const webhookPort = await Input.prompt({
        message: "Webhook port",
        default: "8443",
      });
      config.webhookPort = parseInt(webhookPort, 10) || 8443;
      const ownerPhone = await Input.prompt({
        message: "Owner phone number (optional, for owner detection)",
        default: "",
      });
      if (ownerPhone.length > 0) {
        config.ownerPhone = ownerPhone;
      }
      config.classification = await Select.prompt({
        message: "Classification level",
        options: ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"],
        default: "PUBLIC",
      });
      break;
    }

    case "webchat": {
      const port = await Input.prompt({
        message: "WebChat port",
        default: "8765",
      });
      config.port = parseInt(port, 10) || 8765;
      config.classification = await Select.prompt({
        message: "Classification level",
        options: ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"],
        default: "PUBLIC",
      });
      break;
    }

    case "email": {
      config.smtpApiUrl = await Input.prompt({
        message: "SMTP relay API URL (e.g. SendGrid, Mailgun endpoint)",
      });
      config.smtpApiKey = await Input.prompt({
        message: "SMTP relay API key",
      });
      config.imapHost = await Input.prompt({
        message: "IMAP server hostname",
      });
      const imapPort = await Input.prompt({
        message: "IMAP port",
        default: "993",
      });
      config.imapPort = parseInt(imapPort, 10) || 993;
      config.imapUser = await Input.prompt({
        message: "IMAP username (email address)",
      });
      config.imapPassword = await Input.prompt({
        message: "IMAP password",
      });
      config.fromAddress = await Input.prompt({
        message: "From address for outgoing mail",
      });
      const pollInterval = await Input.prompt({
        message: "Poll interval (ms)",
        default: "30000",
      });
      config.pollInterval = parseInt(pollInterval, 10) || 30000;
      const ownerEmail = await Input.prompt({
        message: "Owner email (optional, for owner detection)",
        default: "",
      });
      if (ownerEmail.length > 0) {
        config.ownerEmail = ownerEmail;
      }
      config.classification = await Select.prompt({
        message: "Classification level",
        options: ["CONFIDENTIAL", "PUBLIC", "INTERNAL", "RESTRICTED"],
        default: "CONFIDENTIAL",
      });
      break;
    }

    case "signal": {
      // Step 1: Find or install signal-cli
      console.log("\nChecking for signal-cli...");
      let signalCliPath = "signal-cli";
      let signalJavaHome: string | undefined;
      const cliCheck = await checkSignalCli();

      if (cliCheck.ok) {
        signalCliPath = cliCheck.value.path;
        console.log(`  Found: ${cliCheck.value.version} (${signalCliPath})`);
        signalJavaHome = cliCheck.value.javaHome;
      } else {
        // Not found — offer to download
        console.log(
          "  signal-cli not found on PATH or in ~/.triggerfish/bin/\n",
        );
        const installIt = await Confirm.prompt({
          message: "Download and install signal-cli?",
          default: true,
        });

        if (!installIt) {
          console.error("\n  Install signal-cli manually before continuing:");
          console.error("    https://github.com/AsamK/signal-cli/releases\n");
          Deno.exit(1);
        }

        console.log("\n  Fetching latest release info...");
        const releaseResult = await fetchLatestVersion();
        if (!releaseResult.ok) {
          console.error(`  Failed: ${releaseResult.error}`);
          Deno.exit(1);
        }

        const installResult = await downloadSignalCli(releaseResult.value);
        if (!installResult.ok) {
          console.error(`  Installation failed: ${installResult.error}`);
          Deno.exit(1);
        }

        signalCliPath = installResult.value.path;
        signalJavaHome = installResult.value.javaHome;
      }

      // Step 2: Get phone number
      config.account = await Input.prompt({
        message: "Your Signal phone number (E.164 format, e.g. +15551234567)",
      });

      // Step 3: Link or skip
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

      const tcpPort = 7583;
      const tcpHost = "localhost";

      if (setupMode === "link") {
        console.log("\nStarting device link...");
        console.log(
          "Open Signal on your phone: Settings > Linked Devices > Link New Device\n",
        );

        const linkResult = await startLinkProcess(
          "Triggerfish",
          signalCliPath,
          signalJavaHome,
        );

        if (!linkResult.ok) {
          console.error(`  Link failed: ${linkResult.error}`);
          console.error(
            `  You can link manually: ${signalCliPath} link -n Triggerfish`,
          );
          Deno.exit(1);
        }

        // Display QR code
        await renderQrCode(linkResult.value.uri);
        console.log("Scan this QR code with Signal on your phone.");
        console.log("Waiting for link to complete...\n");

        // Wait for the link process to finish
        const linkStatus = await linkResult.value.process.status;
        if (!linkStatus.success) {
          console.error("  Device linking failed. Check signal-cli output.");
          Deno.exit(1);
        }
        console.log("  Device linked successfully!\n");
      }

      // Step 4: Start daemon or detect existing
      const alreadyRunning = await isDaemonRunning(tcpHost, tcpPort);
      if (alreadyRunning) {
        console.log(
          `  signal-cli daemon already running on ${tcpHost}:${tcpPort}`,
        );
      } else {
        const startIt = await Confirm.prompt({
          message: `Start signal-cli daemon on tcp://${tcpHost}:${tcpPort}?`,
          default: true,
        });
        if (startIt) {
          console.log("  Starting signal-cli daemon...");
          const daemonResult = startDaemon(
            config.account as string,
            tcpHost,
            tcpPort,
            signalCliPath,
            signalJavaHome,
          );
          if (!daemonResult.ok) {
            console.error(`  Failed: ${daemonResult.error}`);
            console.error(
              `  Start manually: ${signalCliPath} -a ${config.account} daemon --tcp localhost:7583`,
            );
          } else {
            const ready = await waitForDaemon(tcpHost, tcpPort);
            if (ready) {
              console.log("  Daemon is running.");
            } else {
              const stderr = await daemonResult.value.stderrText();
              console.error(
                "  Daemon started but not reachable yet. It may still be initializing.",
              );
              if (stderr) {
                console.error(`  signal-cli stderr: ${stderr}`);
              }
              console.error(
                `  Check: ${signalCliPath} -a ${config.account} daemon --tcp localhost:7583`,
              );
            }
          }
        } else {
          console.log("\n  Start it manually before running Triggerfish:");
          console.log(
            `  ${signalCliPath} -a ${config.account} daemon --tcp ${tcpHost}:${tcpPort}\n`,
          );
        }
      }

      config.endpoint = `tcp://${tcpHost}:${tcpPort}`;

      // Step 5: Policy config
      const enablePairing = await Confirm.prompt({
        message:
          "Enable pairing mode? (new contacts must send a one-time code before chatting)",
        default: false,
      });
      if (enablePairing) {
        config.pairing = true;
        console.log(
          "\n  Pairing mode: new contacts must send a 6-digit code to start chatting.",
        );
        console.log(
          '  Generate codes at runtime: ask your agent "generate a pairing code for Signal"',
        );
        console.log(
          "  Codes expire after 5 minutes and can only be used once.\n",
        );
      }
      config.defaultGroupMode = await Select.prompt({
        message: "Default group chat mode",
        options: [
          { name: "Always respond", value: "always" },
          { name: "Only when mentioned", value: "mentioned-only" },
          { name: "Owner-only commands", value: "owner-only" },
        ],
        default: "always",
      });
      config.classification = await Select.prompt({
        message: "Classification level",
        options: ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"],
        default: "PUBLIC",
      });
      break;
    }
  }

  return config;
}

/** Prompt for plugin-specific config fields and return the config object. */
export async function promptPluginConfig(
  pluginType: PluginType,
): Promise<Record<string, unknown>> {
  const config: Record<string, unknown> = {};

  switch (pluginType) {
    case "obsidian": {
      // Vault path with validation
      let vaultPath = "";
      while (true) {
        vaultPath = await Input.prompt({
          message: "Path to your Obsidian vault",
        });
        if (vaultPath.length === 0) {
          console.log("  Vault path is required.");
          continue;
        }
        // Expand ~ to home directory
        vaultPath = expandTilde(vaultPath);
        // Validate .obsidian/ marker
        try {
          await Deno.stat(join(vaultPath, ".obsidian"));
          break;
        } catch {
          console.log(
            `  Not a valid Obsidian vault (no .obsidian/ folder found at ${vaultPath})`,
          );
          console.log("  Please enter the root folder of your Obsidian vault.");
        }
      }
      config.enabled = true;
      config.vault_path = vaultPath;

      config.classification = await Select.prompt({
        message: "Vault classification level",
        options: ["INTERNAL", "PUBLIC", "CONFIDENTIAL", "RESTRICTED"],
        default: "INTERNAL",
      });

      const enableDaily = await Confirm.prompt({
        message: "Enable daily notes?",
        default: true,
      });
      if (enableDaily) {
        config.daily_notes = {
          folder: "daily",
          date_format: "YYYY-MM-DD",
        };
      }

      console.log("  \u2713 Obsidian vault configured");
      break;
    }
  }

  return config;
}
