/**
 * Interactive prompt for WebChat channel configuration.
 * @module
 */

import { Input, Select } from "@cliffy/prompt";

/** Prompt for WebChat port and classification. */
export async function promptWebchatConfig(): Promise<Record<string, unknown>> {
  const port = await Input.prompt({
    message: "WebChat port",
    default: "8765",
  });

  const classification = await Select.prompt({
    message: "Classification level",
    options: ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"],
    default: "PUBLIC",
  });

  return {
    port: parseInt(port, 10) || 8765,
    classification,
  };
}
