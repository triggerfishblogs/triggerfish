/**
 * Webhook handling: HMAC verification, event routing, and signing.
 *
 * @module
 */

export {
  verifyHmac,
  verifyHmacAsync,
  computeHmac,
  createWebhookHandler,
  type WebhookEvent,
  type WebhookEventHandler,
  type WebhookSource,
  type WebhookHandler,
} from "./webhooks.ts";

export { signWebhook, verifyWebhookSignature } from "./security.ts";

export {
  createRateLimiter,
  type RateLimiter,
  type RateLimiterConfig,
} from "./rate_limiter.ts";

export {
  createReplayGuard,
  type ReplayGuard,
} from "./replay_guard.ts";
