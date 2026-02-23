/**
 * Google API error wrapping and classification.
 *
 * Detects common Google API error patterns (quota exceeded, invalid key,
 * model not found) and wraps them with user-friendly messages and
 * actionable remediation URLs.
 *
 * @module
 */

/** Match a quota/rate-limit error and return a descriptive Error, or null. */
function matchQuotaError(
  msg: string,
  modelName: string,
): Error | null {
  const isQuota = msg.includes("429") || msg.includes("quota") ||
    msg.includes("RESOURCE_EXHAUSTED");
  if (!isQuota) return null;
  if (msg.includes("limit: 0") || msg.includes("limit:0")) {
    return new Error(
      `Google API key has zero quota for ${modelName}. ` +
        `Your key may be on the free tier without access to this model, or billing is not enabled. ` +
        `Enable billing at https://console.cloud.google.com/billing or use a different model.\n\n${msg}`,
    );
  }
  return new Error(
    `Google API rate limit exceeded for ${modelName}. ` +
      `Wait a moment and try again, or check your quota at https://console.cloud.google.com/apis/dashboard\n\n${msg}`,
  );
}

/** Match an authentication/permission error and return a descriptive Error, or null. */
function matchAuthError(msg: string, modelName: string): Error | null {
  const isAuth = msg.includes("401") || msg.includes("403") ||
    msg.includes("API_KEY_INVALID") || msg.includes("PERMISSION_DENIED");
  if (!isAuth) return null;
  return new Error(
    `Google API key is invalid or lacks permission for ${modelName}. ` +
      `Check your key at https://aistudio.google.com/apikey\n\n${msg}`,
  );
}

/** Match a model-not-found error and return a descriptive Error, or null. */
function matchNotFoundError(
  msg: string,
  modelName: string,
): Error | null {
  if (!msg.includes("404") && !msg.includes("not found")) return null;
  return new Error(
    `Model '${modelName}' not found. Check available models at https://ai.google.dev/gemini-api/docs/models\n\n${msg}`,
  );
}

/**
 * Wrap Google API errors with user-friendly messages.
 *
 * Detects common error patterns (quota exceeded, invalid key, etc.)
 * and prepends a clear explanation before the raw error.
 */
export function wrapGoogleError(err: unknown, modelName: string): Error {
  const msg = err instanceof Error ? err.message : String(err);
  return matchQuotaError(msg, modelName) ??
    matchAuthError(msg, modelName) ??
    matchNotFoundError(msg, modelName) ??
    (err instanceof Error ? err : new Error(msg));
}
