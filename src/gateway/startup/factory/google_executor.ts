/**
 * Google Workspace tool executor builder.
 *
 * Creates the full auth → client → services → executor chain.
 * Auth failures are lazy — if tokens don't exist, the user gets a
 * clear error at tool-call time, not at startup.
 * @module
 */

import type { ClassificationLevel } from "../../../core/types/classification.ts";
import type { SessionId } from "../../../core/types/session.ts";
import {
  createCalendarService,
  createDriveService,
  createGmailService,
  createGoogleApiClient,
  createGoogleAuthManager,
  createGoogleToolExecutor,
  createSheetsService,
  createTasksService,
} from "../../../integrations/google/mod.ts";
import { createKeychain } from "../../../core/secrets/keychain/keychain.ts";

/** Options for building the Google executor. */
interface BuildGoogleExecutorOptions {
  readonly getSessionTaint: () => ClassificationLevel;
  readonly sourceSessionId: SessionId;
  /** When false, skip creating the full service chain entirely. */
  readonly available?: boolean;
}

/**
 * Build Google Workspace tool executor.
 *
 * Creates the full auth → client → services → executor chain.
 * When `available` is false, returns undefined immediately without
 * instantiating any Google infrastructure.
 */
export function buildGoogleExecutor(
  options: BuildGoogleExecutorOptions,
):
  | ((name: string, input: Record<string, unknown>) => Promise<string | null>)
  | undefined {
  if (options.available === false) return undefined;
  try {
    const secretStore = createKeychain();
    const authManager = createGoogleAuthManager(secretStore);
    const apiClient = createGoogleApiClient(authManager);
    return createGoogleToolExecutor({
      gmail: createGmailService(apiClient),
      calendar: createCalendarService(apiClient),
      tasks: createTasksService(apiClient),
      drive: createDriveService(apiClient),
      sheets: createSheetsService(apiClient),
      sessionTaint: options.getSessionTaint,
      sourceSessionId: options.sourceSessionId,
    });
  } catch {
    return undefined;
  }
}
