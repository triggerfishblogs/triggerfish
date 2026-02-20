/**
 * Secret management: keychain CRUD and plaintext-to-keychain migration.
 * @module
 */

import { parse as parseYaml, stringify as stringifyYaml } from "@std/yaml";
import { backupConfig, resolveConfigPath } from "./paths.ts";
import { createKeychain } from "../core/secrets/keychain.ts";
import { findSecretRefs } from "../core/secrets/resolver.ts";
import { writeNestedYamlValue, readNestedYamlValue } from "./config.ts";

/**
 * Store a secret in the OS keychain.
 */
export async function runConfigSetSecret(
  flags: Readonly<Record<string, boolean | string>>,
): Promise<void> {
  const key = flags["secret_key"] as string | undefined;
  const value = flags["secret_value"] as string | undefined;

  if (!key || value === undefined) {
    console.error("Usage: triggerfish config set-secret <key> <value>");
    Deno.exit(1);
  }

  const store = createKeychain();
  const result = await store.setSecret(key, value);
  if (result.ok) {
    console.log(`Secret "${key}" stored in keychain.`);
  } else {
    console.error(`Failed to store secret: ${result.error}`);
    Deno.exit(1);
  }
}

/**
 * Retrieve a secret from the OS keychain.
 */
export async function runConfigGetSecret(
  flags: Readonly<Record<string, boolean | string>>,
): Promise<void> {
  const key = flags["secret_key"] as string | undefined;

  if (!key) {
    console.error("Usage: triggerfish config get-secret <key>");
    Deno.exit(1);
  }

  const store = createKeychain();
  const result = await store.getSecret(key);
  if (result.ok) {
    console.log(result.value);
  } else {
    console.error(`Secret "${key}" not found in keychain.`);
    Deno.exit(1);
  }
}

/**
 * Canonical set of known-secret config field paths and their keychain key names.
 *
 * Used by `migrate-secrets` to detect plaintext values in config fields
 * that should be stored in the keychain.
 */
const KNOWN_SECRET_FIELDS: ReadonlyArray<{
  readonly path: string;
  readonly keychainKey: (parsed: Record<string, unknown>) => string | undefined;
}> = [
  {
    path: "web.search.api_key",
    keychainKey: () => "web:search:apiKey",
  },
  {
    path: "channels.telegram.botToken",
    keychainKey: () => "telegram:botToken",
  },
  {
    path: "channels.discord.botToken",
    keychainKey: () => "discord:botToken",
  },
  {
    path: "channels.slack.botToken",
    keychainKey: () => "slack:botToken",
  },
  {
    path: "channels.slack.appToken",
    keychainKey: () => "slack:appToken",
  },
  {
    path: "channels.slack.signingSecret",
    keychainKey: () => "slack:signingSecret",
  },
  {
    path: "channels.whatsapp.accessToken",
    keychainKey: () => "whatsapp:accessToken",
  },
  {
    path: "channels.whatsapp.webhookVerifyToken",
    keychainKey: () => "whatsapp:webhookVerifyToken",
  },
  {
    path: "channels.email.smtpPassword",
    keychainKey: () => "email:smtpPassword",
  },
  {
    path: "channels.email.imapPassword",
    keychainKey: () => "email:imapPassword",
  },
];

/**
 * Migrate plaintext secrets in triggerfish.yaml to the OS keychain.
 *
 * Detects plaintext values in known secret fields, stores them in
 * the keychain, and rewrites the config with `secret:` references.
 * Creates a timestamped backup before modifying the file.
 */
export async function runConfigMigrateSecrets(): Promise<void> {
  const configPath = resolveConfigPath();

  let raw: string;
  try {
    raw = await Deno.readTextFile(configPath);
  } catch {
    console.error(`Cannot read config: ${configPath}`);
    Deno.exit(1);
    return;
  }

  let parsed: Record<string, unknown>;
  try {
    const p = parseYaml(raw);
    if (typeof p !== "object" || p === null) {
      console.error("Config file did not parse to an object");
      Deno.exit(1);
      return;
    }
    parsed = p as Record<string, unknown>;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Failed to parse config: ${message}`);
    Deno.exit(1);
    return;
  }

  // Also detect provider apiKey fields dynamically
  const providers = (
    (parsed.models as Record<string, unknown> | undefined)
      ?.providers
  ) as Record<string, unknown> | undefined;

  const dynamicSecretFields: Array<{
    path: string;
    keychainKey: () => string;
  }> = [];

  if (providers) {
    for (const providerName of Object.keys(providers)) {
      dynamicSecretFields.push({
        path: `models.providers.${providerName}.apiKey`,
        keychainKey: () => `provider:${providerName}:apiKey`,
      });
    }
  }

  const allFields = [...KNOWN_SECRET_FIELDS, ...dynamicSecretFields];

  const store = createKeychain();
  const migrated: Array<{ path: string; keychainKey: string }> = [];
  const alreadyRefs: string[] = [];

  for (const field of allFields) {
    const value = readNestedYamlValue(parsed, field.path);
    if (typeof value !== "string" || value.length === 0) continue;

    if (value.startsWith("secret:")) {
      alreadyRefs.push(field.path);
      continue;
    }

    const keychainKey = field.keychainKey(parsed);
    if (!keychainKey) continue;

    // Store in keychain
    const result = await store.setSecret(keychainKey, value);
    if (!result.ok) {
      console.error(`Failed to store secret for ${field.path}: ${result.error}`);
      Deno.exit(1);
      return;
    }

    // Update parsed config with reference
    writeNestedYamlValue(parsed, field.path, `secret:${keychainKey}`);
    migrated.push({ path: field.path, keychainKey });
  }

  if (migrated.length === 0) {
    if (alreadyRefs.length > 0) {
      console.log(`All ${alreadyRefs.length} secret field(s) already use secret: references. Nothing to migrate.`);
    } else {
      console.log("No plaintext secrets found in known fields. Nothing to migrate.");
    }
    return;
  }

  // Create backup before modifying
  await backupConfig(configPath);

  // Write updated config
  const yaml = stringifyYaml(parsed);
  const content =
    `# Triggerfish Configuration\n# Generated by triggerfish dive\n\n${yaml}`;
  await Deno.writeTextFile(configPath, content);

  console.log(`\nMigrated ${migrated.length} secret(s) to OS keychain:\n`);
  for (const { path, keychainKey } of migrated) {
    console.log(`  ${path}  \u2192  secret:${keychainKey}`);
  }
  console.log(`\nBackup saved. Config updated: ${configPath}`);

  // Report any refs already in place
  if (alreadyRefs.length > 0) {
    console.log(`\n${alreadyRefs.length} field(s) already used secret: references (unchanged):`);
    for (const p of alreadyRefs) {
      console.log(`  ${p}`);
    }
  }

  // Show any other secret: refs in the config for awareness
  const allRefs = findSecretRefs(parsed);
  if (allRefs.length > 0) {
    console.log(`\n${allRefs.length} total secret: reference(s) now in config.`);
  }

  console.log();
}
