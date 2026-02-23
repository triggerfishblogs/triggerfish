/**
 * Webhook HTTP request handler for the gateway.
 *
 * Routes inbound POST requests on /webhooks/:sourceId to the
 * scheduler service, extracting HMAC signatures from standard headers.
 *
 * @module
 */

import type { SchedulerService } from "../../scheduler/service_types.ts";

// ─── Webhook HTTP handler ────────────────────────────────────────────────────

/** Extract the HMAC signature from standard webhook request headers. */
function extractWebhookSignature(request: Request): string {
  return request.headers.get("x-hub-signature-256") ??
    request.headers.get("x-signature") ??
    "";
}

/** Map a webhook error message to the appropriate HTTP status code. */
function mapWebhookErrorStatus(errorMessage: string): number {
  if (errorMessage.includes("Invalid HMAC")) return 401;
  if (errorMessage.includes("Unknown webhook")) return 404;
  return 400;
}

/** Build a JSON Response with the given body and status. */
function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(
    JSON.stringify(body),
    { status, headers: { "content-type": "application/json" } },
  );
}

/** Extract the source ID from the webhook URL path. Returns empty string if missing. */
function extractWebhookSourceId(url: URL): string {
  return url.pathname.slice("/webhooks/".length);
}

/** Forward a validated webhook request to the scheduler and build the response. */
async function forwardWebhookToScheduler(
  request: Request,
  sourceId: string,
  scheduler: SchedulerService,
): Promise<Response> {
  const signature = extractWebhookSignature(request);
  const body = await request.text();
  const result = await scheduler.handleWebhookRequest(sourceId, body, signature);

  if (result.ok) {
    return jsonResponse({ ok: true }, 200);
  }
  return jsonResponse({ error: result.error }, mapWebhookErrorStatus(result.error));
}

/**
 * Handle an inbound webhook HTTP request.
 *
 * Routes POST /webhooks/:sourceId to the scheduler service,
 * reading the HMAC signature from standard webhook headers.
 */
export async function routeWebhookHttp(
  request: Request,
  url: URL,
  scheduler: SchedulerService,
): Promise<Response> {
  const sourceId = extractWebhookSourceId(url);
  if (!sourceId) {
    return jsonResponse({ error: "Missing source ID" }, 400);
  }
  return forwardWebhookToScheduler(request, sourceId, scheduler);
}
