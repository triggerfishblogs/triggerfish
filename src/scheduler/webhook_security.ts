/**
 * Webhook security — HMAC-SHA256 signing and verification.
 *
 * Provides standalone functions for generating and verifying
 * HMAC-SHA256 signatures for webhook payloads using the Web Crypto API.
 * These are simpler, dedicated functions separate from the webhook
 * handler pipeline in `webhooks.ts`.
 *
 * @module
 */

/**
 * Sign a webhook payload with HMAC-SHA256.
 *
 * Computes the HMAC-SHA256 digest of `payload` using `secret` and
 * returns the hex-encoded signature string.
 *
 * @param secret - The shared secret key
 * @param payload - The raw payload string to sign
 * @returns Hex-encoded HMAC-SHA256 signature
 */
export async function signWebhook(
  secret: string,
  payload: string,
): Promise<string> {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verify an HMAC-SHA256 signature for a webhook payload.
 *
 * Computes the expected signature and compares it against the provided
 * signature using constant-time comparison to prevent timing attacks.
 *
 * @param secret - The shared secret key
 * @param payload - The raw payload string that was signed
 * @param signature - The hex-encoded signature to verify
 * @returns true if the signature is valid, false otherwise
 */
export async function verifyWebhookSignature(
  secret: string,
  payload: string,
  signature: string,
): Promise<boolean> {
  const expected = await signWebhook(secret, payload);

  // Constant-time comparison to prevent timing attacks
  if (expected.length !== signature.length) return false;

  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }

  return diff === 0;
}
