/**
 * Unit tests for WebSocket authentication and Origin validation helpers.
 *
 * @module
 */
import { assertEquals } from "@std/assert";
import {
  extractBearerToken,
  isOriginAllowed,
  rejectWebSocketUpgrade,
} from "../../../src/core/security/websocket_auth.ts";

// --- extractBearerToken ---

Deno.test("extractBearerToken: extracts token from Authorization: Bearer header", () => {
  const req = new Request("http://localhost/", {
    headers: { authorization: "Bearer secret123" },
  });
  assertEquals(extractBearerToken(req), "secret123");
});

Deno.test("extractBearerToken: extracts token from ?token= query param", () => {
  const req = new Request("http://localhost/?token=querytoken");
  assertEquals(extractBearerToken(req), "querytoken");
});

Deno.test("extractBearerToken: Authorization header takes precedence over query param", () => {
  const req = new Request("http://localhost/?token=querytoken", {
    headers: { authorization: "Bearer headertoken" },
  });
  assertEquals(extractBearerToken(req), "headertoken");
});

Deno.test("extractBearerToken: returns null when neither source is present", () => {
  const req = new Request("http://localhost/");
  assertEquals(extractBearerToken(req), null);
});

// --- isOriginAllowed ---

Deno.test('isOriginAllowed: wildcard "*" permits any non-null origin', () => {
  assertEquals(isOriginAllowed("https://example.com", ["*"]), true);
  assertEquals(isOriginAllowed("http://evil.com", ["*"]), true);
});

Deno.test('isOriginAllowed: wildcard "*" permits null origin', () => {
  assertEquals(isOriginAllowed(null, ["*"]), true);
});

Deno.test("isOriginAllowed: exact match permits listed origin", () => {
  assertEquals(
    isOriginAllowed("https://example.com", ["https://example.com"]),
    true,
  );
});

Deno.test('isOriginAllowed: "null" entry permits null origin (file:// pages)', () => {
  assertEquals(isOriginAllowed(null, ["null"]), true);
});

Deno.test('isOriginAllowed: rejects null origin when "null" not in list', () => {
  assertEquals(isOriginAllowed(null, ["https://example.com"]), false);
});

Deno.test("isOriginAllowed: rejects origin not in list", () => {
  assertEquals(
    isOriginAllowed("https://evil.com", ["https://example.com"]),
    false,
  );
});

// --- rejectWebSocketUpgrade ---

Deno.test("rejectWebSocketUpgrade: returns null when no options configured", () => {
  const req = new Request("ws://localhost/");
  assertEquals(rejectWebSocketUpgrade(req, {}), null);
});

Deno.test("rejectWebSocketUpgrade: returns 401 when token required but no auth header or query param", () => {
  const req = new Request("ws://localhost/");
  const result = rejectWebSocketUpgrade(req, { token: "secret" });
  assertEquals(result?.status, 401);
});

Deno.test("rejectWebSocketUpgrade: returns 401 when wrong token provided in header", () => {
  const req = new Request("ws://localhost/", {
    headers: { authorization: "Bearer wrongtoken" },
  });
  const result = rejectWebSocketUpgrade(req, { token: "secret" });
  assertEquals(result?.status, 401);
});

Deno.test("rejectWebSocketUpgrade: returns null when correct token provided in Authorization header", () => {
  const req = new Request("ws://localhost/", {
    headers: { authorization: "Bearer secret" },
  });
  assertEquals(rejectWebSocketUpgrade(req, { token: "secret" }), null);
});

Deno.test("rejectWebSocketUpgrade: returns null when correct token provided in ?token= param", () => {
  const req = new Request("ws://localhost/?token=secret");
  assertEquals(rejectWebSocketUpgrade(req, { token: "secret" }), null);
});

Deno.test("rejectWebSocketUpgrade: returns 403 when Origin not in allowedOrigins", () => {
  const req = new Request("ws://localhost/", {
    headers: { origin: "https://evil.com" },
  });
  const result = rejectWebSocketUpgrade(req, {
    allowedOrigins: ["https://example.com"],
  });
  assertEquals(result?.status, 403);
});

Deno.test("rejectWebSocketUpgrade: returns null when Origin matches allowedOrigins", () => {
  const req = new Request("ws://localhost/", {
    headers: { origin: "https://example.com" },
  });
  assertEquals(
    rejectWebSocketUpgrade(req, { allowedOrigins: ["https://example.com"] }),
    null,
  );
});

Deno.test("rejectWebSocketUpgrade: returns null when allowedOrigins is empty (not configured — no enforcement)", () => {
  const req = new Request("ws://localhost/", {
    headers: { origin: "https://anything.com" },
  });
  assertEquals(rejectWebSocketUpgrade(req, { allowedOrigins: [] }), null);
});
