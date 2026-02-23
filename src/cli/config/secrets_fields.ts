/**
 * Secret field descriptors — known config paths that hold sensitive values.
 *
 * Provides the canonical mapping of config YAML field paths to their
 * corresponding keychain key names. Used by the secret migration flow
 * to detect plaintext values and rewrite them as `secret:` references.
 *
 * @module
 */

/** A secret field descriptor with its config path and keychain key derivation. */
export interface SecretFieldDescriptor {
  readonly path: string;
  readonly keychainKey: (
    parsed: Record<string, unknown>,
  ) => string | undefined;
}

/**
 * Canonical set of known-secret config field paths and their keychain key names.
 *
 * Used by `migrate-secrets` to detect plaintext values in config fields
 * that should be stored in the keychain.
 */
export const KNOWN_SECRET_FIELDS: ReadonlyArray<SecretFieldDescriptor> = [
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
 * Build dynamic secret field descriptors for provider apiKey entries.
 *
 * Scans `models.providers` in the parsed config and creates a field
 * descriptor for each provider's `apiKey`.
 */
export function collectProviderSecretFields(
  parsed: Record<string, unknown>,
): ReadonlyArray<SecretFieldDescriptor> {
  const providers = (
    (parsed.models as Record<string, unknown> | undefined)
      ?.providers
  ) as Record<string, unknown> | undefined;

  if (!providers) return [];

  return Object.keys(providers).map((providerName) => ({
    path: `models.providers.${providerName}.apiKey`,
    keychainKey: () => `provider:${providerName}:apiKey`,
  }));
}
