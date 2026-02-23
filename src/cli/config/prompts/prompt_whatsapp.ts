/**
 * Interactive prompt for WhatsApp channel configuration.
 * @module
 */

import { Input, Select } from "@cliffy/prompt";

/** Prompt for WhatsApp Business API credentials. */
async function promptWhatsappCredentials(): Promise<Record<string, unknown>> {
  const accessToken = await Input.prompt({
    message: "Meta Business API access token",
  });
  const phoneNumberId = await Input.prompt({
    message: "Phone number ID",
  });
  const verifyToken = await Input.prompt({
    message: "Webhook verify token",
  });
  return { accessToken, phoneNumberId, verifyToken };
}

/** Prompt for WhatsApp webhook and owner settings. */
async function promptWhatsappSettings(): Promise<Record<string, unknown>> {
  const webhookPort = await Input.prompt({
    message: "Webhook port",
    default: "8443",
  });
  const ownerPhone = await Input.prompt({
    message: "Owner phone number (optional, for owner detection)",
    default: "",
  });
  const config: Record<string, unknown> = {
    webhookPort: parseInt(webhookPort, 10) || 8443,
  };
  if (ownerPhone.length > 0) {
    config.ownerPhone = ownerPhone;
  }
  return config;
}

/** Prompt for WhatsApp Business API credentials and classification. */
export async function promptWhatsappConfig(): Promise<Record<string, unknown>> {
  const credentials = await promptWhatsappCredentials();
  const settings = await promptWhatsappSettings();

  const classification = await Select.prompt({
    message: "Classification level",
    options: ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"],
    default: "PUBLIC",
  });

  return { ...credentials, ...settings, classification };
}
