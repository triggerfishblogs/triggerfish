/**
 * Remote access tunnel tests.
 *
 * All tests use a mock CommandRunner so no real Tailscale, WireGuard,
 * or cloudflared binaries are required.
 */
import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "jsr:@std/assert";
import { createTunnelService } from "../../src/remote/tunnel.ts";
import type {
  CommandResult,
  CommandRunner,
  TunnelConfig,
} from "../../src/remote/tunnel.ts";

// ---------------------------------------------------------------------------
// Mock command runner
// ---------------------------------------------------------------------------

interface MockCommandRunner extends CommandRunner {
  /** All calls recorded during the test. */
  readonly calls: Array<{ readonly cmd: string; readonly args: readonly string[] }>;
}

/**
 * Create a mock command runner that returns pre-configured responses.
 *
 * Keys in the `responses` map are matched against `cmd arg0 arg1 ...`.
 * If no matching key is found the runner returns a generic failure.
 */
function createMockCommandRunner(
  responses: Map<string, CommandResult>,
): MockCommandRunner {
  const calls: Array<{ cmd: string; args: readonly string[] }> = [];

  return {
    get calls() {
      return calls;
    },
    async run(cmd: string, args: readonly string[]): Promise<CommandResult> {
      calls.push({ cmd, args });
      const key = [cmd, ...args].join(" ");

      // Try exact match first
      const exact = responses.get(key);
      if (exact) return exact;

      // Try prefix match (useful for cloudflared where args include port)
      for (const [pattern, result] of responses) {
        if (key.startsWith(pattern)) return result;
      }

      return {
        success: false,
        stdout: "",
        stderr: `mock: no response configured for "${key}"`,
        code: 127,
      };
    },
  };
}

/** Helper to create a successful CommandResult. */
function ok(stdout: string, stderr = ""): CommandResult {
  return { success: true, stdout, stderr, code: 0 };
}

/** Helper to create a failed CommandResult. */
function fail(stderr: string, code = 1): CommandResult {
  return { success: false, stdout: "", stderr, code };
}

// ---------------------------------------------------------------------------
// Tailscale status JSON fixtures
// ---------------------------------------------------------------------------

const TAILSCALE_STATUS_CONNECTED = JSON.stringify({
  BackendState: "Running",
  Self: {
    TailscaleIPs: ["100.64.0.1", "fd7a:115c:a1e0::1"],
    Online: true,
  },
});

const TAILSCALE_STATUS_NO_IPS = JSON.stringify({
  BackendState: "NeedsLogin",
  Self: { TailscaleIPs: [], Online: false },
});

// ---------------------------------------------------------------------------
// Tests: Tailscale provider
// ---------------------------------------------------------------------------

Deno.test("Tailscale enable: calls tailscale up then status, returns URL", async () => {
  const responses = new Map<string, CommandResult>([
    ["tailscale up", ok("")],
    ["tailscale status --json", ok(TAILSCALE_STATUS_CONNECTED)],
  ]);
  const runner = createMockCommandRunner(responses);
  const config: TunnelConfig = { provider: "tailscale", gatewayPort: 8080 };
  const svc = createTunnelService(config, runner);

  const result = await svc.enable();

  assert(result.ok);
  if (result.ok) {
    assertEquals(result.value, "http://100.64.0.1:8080");
  }
  assertEquals(runner.calls.length, 2);
  assertEquals(runner.calls[0].cmd, "tailscale");
  assertEquals(runner.calls[0].args, ["up"]);
  assertEquals(runner.calls[1].cmd, "tailscale");
  assertEquals(runner.calls[1].args, ["status", "--json"]);
});

Deno.test("Tailscale enable with authKey: includes --authkey flag", async () => {
  const responses = new Map<string, CommandResult>([
    ["tailscale up --authkey=tskey-abc123", ok("")],
    ["tailscale status --json", ok(TAILSCALE_STATUS_CONNECTED)],
  ]);
  const runner = createMockCommandRunner(responses);
  const config: TunnelConfig = {
    provider: "tailscale",
    gatewayPort: 9000,
    authKey: "tskey-abc123",
  };
  const svc = createTunnelService(config, runner);

  const result = await svc.enable();

  assert(result.ok);
  // Verify the authkey arg was passed
  assertEquals(runner.calls[0].args, ["up", "--authkey=tskey-abc123"]);
});

Deno.test("Tailscale enable with hostname: includes --hostname flag", async () => {
  const responses = new Map<string, CommandResult>([
    ["tailscale up --hostname=triggerfish-node", ok("")],
    ["tailscale status --json", ok(TAILSCALE_STATUS_CONNECTED)],
  ]);
  const runner = createMockCommandRunner(responses);
  const config: TunnelConfig = {
    provider: "tailscale",
    gatewayPort: 8080,
    hostname: "triggerfish-node",
  };
  const svc = createTunnelService(config, runner);

  const result = await svc.enable();

  assert(result.ok);
  assertEquals(runner.calls[0].args, ["up", "--hostname=triggerfish-node"]);
});

Deno.test("Tailscale enable with both hostname and authKey", async () => {
  const responses = new Map<string, CommandResult>([
    [
      "tailscale up --hostname=myhost --authkey=tskey-xyz",
      ok(""),
    ],
    ["tailscale status --json", ok(TAILSCALE_STATUS_CONNECTED)],
  ]);
  const runner = createMockCommandRunner(responses);
  const config: TunnelConfig = {
    provider: "tailscale",
    gatewayPort: 3000,
    hostname: "myhost",
    authKey: "tskey-xyz",
  };
  const svc = createTunnelService(config, runner);

  const result = await svc.enable();

  assert(result.ok);
  if (result.ok) {
    assertEquals(result.value, "http://100.64.0.1:3000");
  }
  assertEquals(runner.calls[0].args, [
    "up",
    "--hostname=myhost",
    "--authkey=tskey-xyz",
  ]);
});

Deno.test("Tailscale disable: calls tailscale down", async () => {
  const responses = new Map<string, CommandResult>([
    ["tailscale down", ok("")],
  ]);
  const runner = createMockCommandRunner(responses);
  const config: TunnelConfig = { provider: "tailscale", gatewayPort: 8080 };
  const svc = createTunnelService(config, runner);

  const result = await svc.disable();

  assert(result.ok);
  assertEquals(runner.calls.length, 1);
  assertEquals(runner.calls[0].cmd, "tailscale");
  assertEquals(runner.calls[0].args, ["down"]);
});

Deno.test("Tailscale status connected: parses JSON, returns connected=true with IP", async () => {
  const responses = new Map<string, CommandResult>([
    ["tailscale status --json", ok(TAILSCALE_STATUS_CONNECTED)],
  ]);
  const runner = createMockCommandRunner(responses);
  const config: TunnelConfig = { provider: "tailscale", gatewayPort: 8080 };
  const svc = createTunnelService(config, runner);

  const status = await svc.status();

  assertEquals(status.connected, true);
  assertEquals(status.provider, "tailscale");
  assertEquals(status.ip, "100.64.0.1");
  assertEquals(status.url, "http://100.64.0.1:8080");
  assert(status.since instanceof Date);
});

Deno.test("Tailscale status not connected: returns connected=false", async () => {
  const responses = new Map<string, CommandResult>([
    ["tailscale status --json", fail("not logged in")],
  ]);
  const runner = createMockCommandRunner(responses);
  const config: TunnelConfig = { provider: "tailscale", gatewayPort: 8080 };
  const svc = createTunnelService(config, runner);

  const status = await svc.status();

  assertEquals(status.connected, false);
  assertEquals(status.provider, "tailscale");
  assertStringIncludes(status.error ?? "", "not logged in");
});

Deno.test("Tailscale enable failure: returns error when tailscale up fails", async () => {
  const responses = new Map<string, CommandResult>([
    ["tailscale up", fail("permission denied", 1)],
  ]);
  const runner = createMockCommandRunner(responses);
  const config: TunnelConfig = { provider: "tailscale", gatewayPort: 8080 };
  const svc = createTunnelService(config, runner);

  const result = await svc.enable();

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertStringIncludes(result.error, "tailscale up failed");
    assertStringIncludes(result.error, "permission denied");
  }
});

Deno.test("Tailscale enable: error when status returns no IPs", async () => {
  const responses = new Map<string, CommandResult>([
    ["tailscale up", ok("")],
    ["tailscale status --json", ok(TAILSCALE_STATUS_NO_IPS)],
  ]);
  const runner = createMockCommandRunner(responses);
  const config: TunnelConfig = { provider: "tailscale", gatewayPort: 8080 };
  const svc = createTunnelService(config, runner);

  const result = await svc.enable();

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertStringIncludes(result.error, "No Tailscale IPs");
  }
});

// ---------------------------------------------------------------------------
// Tests: WireGuard provider
// ---------------------------------------------------------------------------

const WG_SHOW_OUTPUT = `interface: wg-triggerfish
  public key: abc123...
  private key: (hidden)
  listening port: 51820

peer: def456...
  endpoint: 198.51.100.5:51820
  allowed ips: 10.0.0.0/24
  latest handshake: 42 seconds ago
  transfer: 1.23 MiB received, 4.56 MiB sent
`;

Deno.test("WireGuard enable: calls wg-quick up", async () => {
  const responses = new Map<string, CommandResult>([
    ["wg-quick up wg-triggerfish", ok("")],
    ["wg show wg-triggerfish", ok(WG_SHOW_OUTPUT)],
  ]);
  const runner = createMockCommandRunner(responses);
  const config: TunnelConfig = { provider: "wireguard", gatewayPort: 8080 };
  const svc = createTunnelService(config, runner);

  const result = await svc.enable();

  assert(result.ok);
  if (result.ok) {
    assertEquals(result.value, "http://198.51.100.5:8080");
  }
  assertEquals(runner.calls[0].cmd, "wg-quick");
  assertEquals(runner.calls[0].args, ["up", "wg-triggerfish"]);
});

Deno.test("WireGuard disable: calls wg-quick down", async () => {
  const responses = new Map<string, CommandResult>([
    ["wg-quick down wg-triggerfish", ok("")],
  ]);
  const runner = createMockCommandRunner(responses);
  const config: TunnelConfig = { provider: "wireguard", gatewayPort: 8080 };
  const svc = createTunnelService(config, runner);

  const result = await svc.disable();

  assert(result.ok);
  assertEquals(runner.calls[0].cmd, "wg-quick");
  assertEquals(runner.calls[0].args, ["down", "wg-triggerfish"]);
});

Deno.test("WireGuard status: parses endpoint IP from wg show", async () => {
  const responses = new Map<string, CommandResult>([
    ["wg show wg-triggerfish", ok(WG_SHOW_OUTPUT)],
  ]);
  const runner = createMockCommandRunner(responses);
  const config: TunnelConfig = { provider: "wireguard", gatewayPort: 8080 };
  const svc = createTunnelService(config, runner);

  const status = await svc.status();

  assertEquals(status.connected, true);
  assertEquals(status.provider, "wireguard");
  assertEquals(status.ip, "198.51.100.5");
  assertEquals(status.url, "http://198.51.100.5:8080");
});

Deno.test("WireGuard status not active: returns connected=false", async () => {
  const responses = new Map<string, CommandResult>([
    ["wg show wg-triggerfish", fail("Unable to access interface: No such device")],
  ]);
  const runner = createMockCommandRunner(responses);
  const config: TunnelConfig = { provider: "wireguard", gatewayPort: 8080 };
  const svc = createTunnelService(config, runner);

  const status = await svc.status();

  assertEquals(status.connected, false);
  assertEquals(status.provider, "wireguard");
  assertStringIncludes(status.error ?? "", "No such device");
});

Deno.test("WireGuard enable failure: returns error when wg-quick fails", async () => {
  const responses = new Map<string, CommandResult>([
    ["wg-quick up wg-triggerfish", fail("RTNETLINK answers: Operation not permitted")],
  ]);
  const runner = createMockCommandRunner(responses);
  const config: TunnelConfig = { provider: "wireguard", gatewayPort: 8080 };
  const svc = createTunnelService(config, runner);

  const result = await svc.enable();

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertStringIncludes(result.error, "wg-quick up failed");
  }
});

// ---------------------------------------------------------------------------
// Tests: Cloudflared provider
// ---------------------------------------------------------------------------

Deno.test("Cloudflared enable: calls cloudflared tunnel with correct URL", async () => {
  const cfOutput =
    "2024-01-01 INFO Starting tunnel\nhttps://random-name.trycloudflare.com\n";
  const responses = new Map<string, CommandResult>([
    [
      "cloudflared tunnel --url http://localhost:8080",
      ok(cfOutput),
    ],
  ]);
  const runner = createMockCommandRunner(responses);
  const config: TunnelConfig = { provider: "cloudflared", gatewayPort: 8080 };
  const svc = createTunnelService(config, runner);

  const result = await svc.enable();

  assert(result.ok);
  if (result.ok) {
    assertEquals(result.value, "https://random-name.trycloudflare.com");
  }
  assertEquals(runner.calls[0].cmd, "cloudflared");
  assertEquals(runner.calls[0].args, [
    "tunnel",
    "--url",
    "http://localhost:8080",
  ]);
});

Deno.test("Cloudflared disable: calls pkill cloudflared", async () => {
  const responses = new Map<string, CommandResult>([
    ["pkill -f cloudflared", ok("")],
  ]);
  const runner = createMockCommandRunner(responses);
  const config: TunnelConfig = { provider: "cloudflared", gatewayPort: 8080 };
  const svc = createTunnelService(config, runner);

  const result = await svc.disable();

  assert(result.ok);
  assertEquals(runner.calls[0].cmd, "pkill");
  assertEquals(runner.calls[0].args, ["-f", "cloudflared"]);
});

Deno.test("Cloudflared status: running returns connected=true", async () => {
  const responses = new Map<string, CommandResult>([
    ["pgrep -f cloudflared", ok("12345")],
  ]);
  const runner = createMockCommandRunner(responses);
  const config: TunnelConfig = { provider: "cloudflared", gatewayPort: 8080 };
  const svc = createTunnelService(config, runner);

  const status = await svc.status();

  assertEquals(status.connected, true);
  assertEquals(status.provider, "cloudflared");
});

Deno.test("Cloudflared status: not running returns connected=false", async () => {
  const responses = new Map<string, CommandResult>([
    ["pgrep -f cloudflared", fail("", 1)],
  ]);
  const runner = createMockCommandRunner(responses);
  const config: TunnelConfig = { provider: "cloudflared", gatewayPort: 8080 };
  const svc = createTunnelService(config, runner);

  const status = await svc.status();

  assertEquals(status.connected, false);
  assertEquals(status.provider, "cloudflared");
});

Deno.test("Cloudflared enable failure: returns error when command fails", async () => {
  const responses = new Map<string, CommandResult>([
    [
      "cloudflared tunnel --url http://localhost:8080",
      fail("cloudflared: command not found", 127),
    ],
  ]);
  const runner = createMockCommandRunner(responses);
  const config: TunnelConfig = { provider: "cloudflared", gatewayPort: 8080 };
  const svc = createTunnelService(config, runner);

  const result = await svc.enable();

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertStringIncludes(result.error, "cloudflared tunnel failed");
    assertStringIncludes(result.error, "command not found");
  }
});

// ---------------------------------------------------------------------------
// Tests: General / cross-provider
// ---------------------------------------------------------------------------

Deno.test("Tailscale status: returns error on invalid JSON", async () => {
  const responses = new Map<string, CommandResult>([
    ["tailscale status --json", ok("not valid json {{{")],
  ]);
  const runner = createMockCommandRunner(responses);
  const config: TunnelConfig = { provider: "tailscale", gatewayPort: 8080 };
  const svc = createTunnelService(config, runner);

  const status = await svc.status();

  assertEquals(status.connected, false);
  assertStringIncludes(status.error ?? "", "Failed to parse");
});

Deno.test("Cloudflared disable: no process is not an error (exit code 1)", async () => {
  // pkill returns exit code 1 when no process matched -- this should not be an error
  const responses = new Map<string, CommandResult>([
    ["pkill -f cloudflared", { success: false, stdout: "", stderr: "", code: 1 }],
  ]);
  const runner = createMockCommandRunner(responses);
  const config: TunnelConfig = { provider: "cloudflared", gatewayPort: 8080 };
  const svc = createTunnelService(config, runner);

  const result = await svc.disable();

  assert(result.ok);
});

Deno.test("WireGuard enable: falls back to scheme URL when wg show fails", async () => {
  const responses = new Map<string, CommandResult>([
    ["wg-quick up wg-triggerfish", ok("")],
    ["wg show wg-triggerfish", fail("not available")],
  ]);
  const runner = createMockCommandRunner(responses);
  const config: TunnelConfig = { provider: "wireguard", gatewayPort: 9999 };
  const svc = createTunnelService(config, runner);

  const result = await svc.enable();

  assert(result.ok);
  if (result.ok) {
    assertEquals(result.value, "wireguard://wg-triggerfish:9999");
  }
});

Deno.test("Tailscale disable failure: returns error message", async () => {
  const responses = new Map<string, CommandResult>([
    ["tailscale down", fail("daemon not running", 2)],
  ]);
  const runner = createMockCommandRunner(responses);
  const config: TunnelConfig = { provider: "tailscale", gatewayPort: 8080 };
  const svc = createTunnelService(config, runner);

  const result = await svc.disable();

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertStringIncludes(result.error, "tailscale down failed");
    assertStringIncludes(result.error, "daemon not running");
  }
});

Deno.test("WireGuard disable failure: returns error message", async () => {
  const responses = new Map<string, CommandResult>([
    ["wg-quick down wg-triggerfish", fail("interface not found", 1)],
  ]);
  const runner = createMockCommandRunner(responses);
  const config: TunnelConfig = { provider: "wireguard", gatewayPort: 8080 };
  const svc = createTunnelService(config, runner);

  const result = await svc.disable();

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertStringIncludes(result.error, "wg-quick down failed");
  }
});
