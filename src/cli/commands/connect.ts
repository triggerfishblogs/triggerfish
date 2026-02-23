/**
 * CLI connect / disconnect command dispatcher.
 *
 * Re-exports Google and GitHub connect modules and provides
 * runConnect and runDisconnect routers.
 * @module
 */

export {
  createOAuthCallbackServer,
  disconnectGoogle,
  GOOGLE_SCOPES,
  OAUTH_SUCCESS_HTML,
  performGoogleOAuth,
  runConnectGoogle,
} from "./connect_google.ts";

export { disconnectGithub, runConnectGithub } from "./connect_github.ts";

/** Print connect usage help. */
function printConnectUsage(): void {
  console.log(`
CONNECT USAGE:
  triggerfish connect google    Authenticate with Google Workspace
  triggerfish connect github    Authenticate with GitHub
`);
}

/** Print disconnect usage help. */
function printDisconnectUsage(): void {
  console.log(`
DISCONNECT USAGE:
  triggerfish disconnect google    Remove Google authentication
  triggerfish disconnect github    Remove GitHub authentication
`);
}

/**
 * Handle `triggerfish connect <service>`.
 */
export async function runConnect(
  subcommand: string | undefined,
  _flags: Readonly<Record<string, boolean | string>>,
): Promise<void> {
  switch (subcommand) {
    case "google": {
      const { runConnectGoogle } = await import("./connect_google.ts");
      await runConnectGoogle();
      break;
    }
    case "github": {
      const { runConnectGithub } = await import("./connect_github.ts");
      await runConnectGithub();
      break;
    }
    default:
      printConnectUsage();
      break;
  }
}

/**
 * Handle `triggerfish disconnect <service>`.
 */
export async function runDisconnect(
  subcommand: string | undefined,
  _flags: Readonly<Record<string, boolean | string>>,
): Promise<void> {
  switch (subcommand) {
    case "google": {
      const { disconnectGoogle } = await import("./connect_google.ts");
      await disconnectGoogle();
      break;
    }
    case "github": {
      const { disconnectGithub } = await import("./connect_github.ts");
      await disconnectGithub();
      break;
    }
    default:
      printDisconnectUsage();
      break;
  }
}
