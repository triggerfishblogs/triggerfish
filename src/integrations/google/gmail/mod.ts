/**
 * Gmail module.
 *
 * Gmail service, tool definitions, and tool executors.
 *
 * @module
 */

export type {
  GmailMessage,
  GmailSearchOptions,
  GmailSendOptions,
  GmailLabelOptions,
  GmailService,
} from "./types_gmail.ts";

export { createGmailService } from "./gmail.ts";

export {
  buildGmailSearchDef,
  buildGmailReadDef,
  buildGmailSendDef,
  buildGmailLabelDef,
} from "./tools_defs_gmail.ts";

export {
  executeGmailSearch,
  executeGmailRead,
  executeGmailSend,
  executeGmailLabel,
} from "./tools_exec_gmail.ts";
