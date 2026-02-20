/**
 * CLI handler for `triggerfish run-triggers`.
 *
 * Forces an immediate trigger run on the running gateway by sending a
 * POST request to the debug endpoint. Intended for debugging only.
 *
 * @module
 */

/** Gateway port (must match server.ts default). */
const GATEWAY_PORT = 18789;

/**
 * Force an immediate trigger run via the running gateway.
 *
 * Sends POST /debug/run-triggers to the local gateway. Requires the
 * gateway daemon to be running. The trigger runs asynchronously inside
 * the daemon; this command returns as soon as the gateway acknowledges
 * the request.
 */
export async function runTriggers(): Promise<void> {
  const url = `http://127.0.0.1:${GATEWAY_PORT}/debug/run-triggers`;

  let response: Response | undefined;
  try {
    response = await fetch(url, {
      method: "POST",
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    console.log("Error: Gateway is not running.");
    console.log("Start it first with: triggerfish start");
    Deno.exit(1);
    return;
  }

  if (response.ok) {
    console.log("Trigger fired. Check daemon logs for output.");
    return;
  }

  let body = "";
  try {
    body = await response.text();
  } catch {
    // ignore
  }
  console.log(`Error: Gateway returned ${response.status}${body ? ` — ${body}` : ""}`);
  Deno.exit(1);
}
