/**
 * GitHub PAT connect/disconnect flow.
 *
 * Provides runConnectGithub and disconnectGithub.
 * @module
 */

import { Input } from "@cliffy/prompt";
import { createKeychain } from "../../core/secrets/keychain/keychain.ts";

/** Print GitHub PAT setup instructions. */
function printGithubSetupInstructions(): void {
  console.log("Connect GitHub\n");
  console.log(
    "This will connect your GitHub account for repos, PRs, issues, and Actions.\n",
  );
  console.log("You need a Personal Access Token (PAT) from GitHub.\n");
  console.log("  Quick setup:");
  console.log("    1. Go to https://github.com/settings/tokens?type=beta");
  console.log('    2. Click "Generate new token"');
  console.log('    3. Name it "triggerfish"');
  console.log("    4. Under Repository access, select the repos you want");
  console.log("    5. Under Permissions, grant:");
  console.log("       - Contents: Read and Write");
  console.log("       - Issues: Read and Write");
  console.log("       - Pull requests: Read and Write");
  console.log("       - Actions: Read-only");
  console.log("    6. Click Generate token and copy it\n");
}

/** Fetch the GitHub user endpoint with a PAT. */
function fetchGithubUser(token: string): Promise<Response> {
  return fetch("https://api.github.com/user", {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
}

/** Report a failed GitHub token verification. */
async function reportGithubTokenFailure(resp: Response): Promise<null> {
  const body = await resp.json().catch(
    () => ({}) as Record<string, unknown>,
  );
  console.log(
    `\nToken verification failed (${resp.status}): ${
      (body as Record<string, string>).message ?? "Unknown error"
    }`,
  );
  console.log(
    "Check that your token is correct and has the required permissions.",
  );
  return null;
}

/** Verify a GitHub PAT against the API. Returns login name or null on failure. */
async function verifyGithubToken(token: string): Promise<string | null> {
  try {
    const resp = await fetchGithubUser(token);
    if (!resp.ok) return await reportGithubTokenFailure(resp);
    const user = await resp.json();
    return (user as Record<string, string>).login;
  } catch (err: unknown) {
    console.log(
      `\nCould not reach GitHub API: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    console.log("Check your network connection and try again.");
    return null;
  }
}

/** Prompt for a GitHub PAT and warn if it looks malformed. Returns trimmed token or null. */
async function promptGithubToken(): Promise<string | null> {
  const token = await Input.prompt({ message: "Paste your token" });
  if (!token.trim()) {
    console.log("No token provided. Aborted.");
    return null;
  }
  const trimmed = token.trim();
  if (!trimmed.startsWith("ghp_") && !trimmed.startsWith("github_pat_")) {
    console.log(
      "Warning: token doesn't look like a GitHub PAT (expected ghp_... or github_pat_...)",
    );
    console.log("Continuing anyway...\n");
  }
  return trimmed;
}

/** Store a verified GitHub PAT in the OS keychain. */
async function storeGithubToken(token: string): Promise<boolean> {
  const secretStore = createKeychain();
  const result = await secretStore.setSecret("github-pat", token);
  if (!result.ok) {
    console.log(`\nFailed to store token: ${result.error}`);
    return false;
  }
  console.log(
    "GitHub connected. Your agent can now use repos, PRs, issues, and Actions.",
  );
  return true;
}

/** Interactive GitHub PAT setup flow. */
export async function runConnectGithub(): Promise<void> {
  printGithubSetupInstructions();
  const trimmed = await promptGithubToken();
  if (!trimmed) return;

  console.log("Verifying token...");
  const login = await verifyGithubToken(trimmed);
  if (login === null) return;
  console.log(`\nAuthenticated as: ${login}`);

  await storeGithubToken(trimmed);
}

/** Remove the GitHub PAT from the OS keychain. */
export async function disconnectGithub(): Promise<void> {
  const secretStore = createKeychain();
  const result = await secretStore.deleteSecret("github-pat");
  if (result.ok) {
    console.log("GitHub disconnected. Token removed from keychain.");
  } else {
    console.log("No GitHub account was connected.");
  }
}
