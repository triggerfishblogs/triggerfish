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
export { disconnectNotion, runConnectNotion } from "./connect_notion.ts";

/** Print connect usage help. */
function printConnectUsage(): void {
  console.log(`
CONNECT USAGE:
  triggerfish connect google    Authenticate with Google Workspace
  triggerfish connect github    Authenticate with GitHub
  triggerfish connect notion    Authenticate with Notion
`);
}

/** Print disconnect usage help. */
function printDisconnectUsage(): void {
  console.log(`
DISCONNECT USAGE:
  triggerfish disconnect google    Remove Google authentication
  triggerfish disconnect github    Remove GitHub authentication
  triggerfish disconnect notion    Remove Notion authentication
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
    case "google":
      await runConnectGoogle();
      break;
    case "github":
      await runConnectGithub();
      break;
    case "notion":
      await runConnectNotion();
      break;
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
    case "google":
      await disconnectGoogle();
      break;
    case "github":
      await disconnectGithub();
      break;
    case "notion":
      await disconnectNotion();
      break;
    default:
      printDisconnectUsage();
      break;
  }
}
