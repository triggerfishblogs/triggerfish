/**
 * Interactive prompt for Email channel configuration.
 * @module
 */

import { Input, Select } from "@cliffy/prompt";

/** Prompt for SMTP relay credentials. */
async function promptSmtpCredentials(): Promise<Record<string, unknown>> {
  const smtpApiUrl = await Input.prompt({
    message: "SMTP relay API URL (e.g. SendGrid, Mailgun endpoint)",
  });
  const smtpApiKey = await Input.prompt({
    message: "SMTP relay API key",
  });
  return { smtpApiUrl, smtpApiKey };
}

/** Prompt for IMAP server connection details. */
async function promptImapConnection(): Promise<Record<string, unknown>> {
  const imapHost = await Input.prompt({
    message: "IMAP server hostname",
  });
  const imapPort = await Input.prompt({
    message: "IMAP port",
    default: "993",
  });
  const imapUser = await Input.prompt({
    message: "IMAP username (email address)",
  });
  const imapPassword = await Input.prompt({
    message: "IMAP password",
  });
  return {
    imapHost,
    imapPort: parseInt(imapPort, 10) || 993,
    imapUser,
    imapPassword,
  };
}

/** Prompt for email sending and polling settings. */
async function promptEmailSettings(): Promise<Record<string, unknown>> {
  const fromAddress = await Input.prompt({
    message: "From address for outgoing mail",
  });
  const pollInterval = await Input.prompt({
    message: "Poll interval (ms)",
    default: "30000",
  });
  const ownerEmail = await Input.prompt({
    message: "Owner email (optional, for owner detection)",
    default: "",
  });

  const config: Record<string, unknown> = {
    fromAddress,
    pollInterval: parseInt(pollInterval, 10) || 30000,
  };
  if (ownerEmail.length > 0) {
    config.ownerEmail = ownerEmail;
  }
  return config;
}

/** Prompt for Email IMAP+SMTP configuration and classification. */
export async function promptEmailConfig(): Promise<Record<string, unknown>> {
  const smtp = await promptSmtpCredentials();
  const imap = await promptImapConnection();
  const settings = await promptEmailSettings();

  const classification = await Select.prompt({
    message: "Classification level",
    options: ["CONFIDENTIAL", "PUBLIC", "INTERNAL", "RESTRICTED"],
    default: "CONFIDENTIAL",
  });

  return { ...smtp, ...imap, ...settings, classification };
}
