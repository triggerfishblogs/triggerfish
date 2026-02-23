/**
 * Scheduler webhook processing — validates inbound webhook HTTP
 * requests and executes them in isolated orchestrator sessions.
 *
 * @module
 */

import type {
  ClassificationLevel,
  Result,
} from "../core/types/classification.ts";
import type { WebhookEvent } from "./webhooks/webhooks.ts";
import type { SchedulerServiceConfig } from "./service_types.ts";
import { verifyHmacAsync } from "./webhooks/webhooks.ts";
import { deliverSchedulerOutput } from "./service_output.ts";
import { logSchedulerTokenUsage } from "./service_cron.ts";

/** Parsed and validated webhook payload. */
interface ValidatedWebhook {
  readonly event: WebhookEvent;
  readonly classification: ClassificationLevel;
}

/** Options for validating an inbound webhook request. */
interface WebhookValidationOptions {
  readonly config: SchedulerServiceConfig;
  readonly sourceId: string;
  readonly body: string;
  readonly signature: string;
}

/** Options for executing a webhook in an orchestrator session. */
interface WebhookExecutionOptions {
  readonly config: SchedulerServiceConfig;
  readonly sourceId: string;
  readonly body: string;
  readonly event: WebhookEvent;
  readonly classification: ClassificationLevel;
}

/** Validate a webhook request: check enabled, source, HMAC, and parse JSON. */
export async function validateWebhookRequest(
  options: WebhookValidationOptions,
): Promise<Result<ValidatedWebhook, string>> {
  const { config, sourceId, body, signature } = options;
  if (!config.webhooks.enabled) {
    return { ok: false, error: "Webhooks are disabled" };
  }
  const source = config.webhooks.sources[sourceId];
  if (!source) {
    return { ok: false, error: `Unknown webhook source: ${sourceId}` };
  }
  const valid = await verifyHmacAsync(body, signature, source.secret);
  if (!valid) {
    return { ok: false, error: "Invalid HMAC signature" };
  }
  return parseWebhookBody(body, source.classification);
}

/** Parse a JSON webhook body into a WebhookEvent. */
function parseWebhookBody(
  body: string,
  classification: ClassificationLevel,
): Result<ValidatedWebhook, string> {
  try {
    const parsed = JSON.parse(body);
    return {
      ok: true,
      value: {
        event: {
          event: parsed.event ?? "unknown",
          data: parsed.data ?? parsed,
        },
        classification,
      },
    };
  } catch {
    return { ok: false, error: "Invalid JSON body" };
  }
}

/** Build the prompt message for a webhook event. */
function buildWebhookPrompt(sourceId: string, event: WebhookEvent, body: string): string {
  return `Webhook event from ${sourceId}: ${event.event}\n\nPayload:\n${body}`;
}

/** Execute a webhook event in an isolated orchestrator session. */
export async function executeWebhookSession(options: WebhookExecutionOptions): Promise<void> {
  const { config, sourceId, body, event, classification } = options;
  try {
    const { orchestrator, session } = await config.orchestratorFactory.create(`webhook-${sourceId}`);
    const result = await orchestrator.executeAgentTurn({
      session,
      message: buildWebhookPrompt(sourceId, event, body),
      targetClassification: classification,
    });
    logSchedulerTokenUsage(`webhook:${sourceId}`, result);
    await deliverSchedulerOutput({ config, result, sessionTaint: session.taint, source: `webhook:${sourceId}` });
  } catch {
    // Webhook processing failures are logged but don't fail the HTTP response
  }
}
