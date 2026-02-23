/**
 * Signal-cli endpoint parsing and connection opening.
 *
 * Parses "tcp://" and "unix://" URIs into typed connection parameters
 * and opens Deno connections to the signal-cli daemon.
 *
 * @module
 */

/** Parsed TCP endpoint. */
export interface TcpEndpoint {
  readonly transport: "tcp";
  readonly hostname: string;
  readonly port: number;
}

/** Parsed Unix socket endpoint. */
export interface UnixEndpoint {
  readonly transport: "unix";
  readonly path: string;
}

/** Parse a TCP endpoint URI into hostname and port. */
function parseTcpEndpoint(endpoint: string): TcpEndpoint {
  const url = new URL(endpoint.replace("tcp://", "http://"));
  // Normalize "localhost" to "127.0.0.1" — signal-cli binds on IPv4,
  // and "localhost" may resolve to ::1 (IPv6) on some systems.
  const hostname = url.hostname === "localhost" ? "127.0.0.1" : url.hostname;
  return {
    transport: "tcp",
    hostname,
    port: parseInt(url.port || "7583", 10),
  };
}

/** Parse a Unix socket endpoint URI into a filesystem path. */
function parseUnixEndpoint(endpoint: string): UnixEndpoint {
  return {
    transport: "unix",
    path: endpoint.slice("unix://".length),
  };
}

/** Parse the endpoint URI into connection parameters. */
export function parseSignalEndpoint(
  endpoint: string,
): TcpEndpoint | UnixEndpoint {
  if (endpoint.startsWith("tcp://")) return parseTcpEndpoint(endpoint);
  if (endpoint.startsWith("unix://")) return parseUnixEndpoint(endpoint);
  throw new Error(`Unsupported endpoint scheme: ${endpoint}`);
}

/** Open a connection to the signal-cli daemon using the parsed endpoint. */
export async function openSignalConnection(
  target: TcpEndpoint | UnixEndpoint,
): Promise<Deno.Conn> {
  if (target.transport === "tcp") {
    return await Deno.connect({
      hostname: target.hostname,
      port: target.port,
    });
  }
  return await (Deno.connect as (
    opts: { transport: "unix"; path: string },
  ) => Promise<Deno.Conn>)({
    transport: "unix",
    path: target.path,
  });
}
