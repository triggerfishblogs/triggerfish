/**
 * Gmail tool definitions.
 *
 * Defines the 4 Gmail tool schemas: search, read, send, label.
 *
 * @module
 */

import type { ToolDefinition } from "../../core/types/tool.ts";

/** Build the gmail_search tool definition. */
export function buildGmailSearchDef(): ToolDefinition {
  return {
    name: "gmail_search",
    description:
      "Search Gmail messages. Returns matching emails with subject, sender, date, and snippet.",
    parameters: {
      query: {
        type: "string",
        description:
          "Gmail search query (same syntax as Gmail search box, e.g. 'from:alice subject:meeting')",
        required: true,
      },
      max_results: {
        type: "number",
        description: "Maximum number of messages to return (default: 10)",
        required: false,
      },
    },
  };
}

/** Build the gmail_read tool definition. */
export function buildGmailReadDef(): ToolDefinition {
  return {
    name: "gmail_read",
    description:
      "Read a specific Gmail message by its ID. Returns the full message body, headers, and labels.",
    parameters: {
      message_id: {
        type: "string",
        description: "The Gmail message ID (from gmail_search results)",
        required: true,
      },
    },
  };
}

function buildGmailSendRequiredParams(): ToolDefinition["parameters"] {
  return {
    to: {
      type: "string",
      description: "Recipient email address",
      required: true,
    },
    subject: {
      type: "string",
      description: "Email subject line",
      required: true,
    },
    body: {
      type: "string",
      description: "Email body text (plain text)",
      required: true,
    },
  };
}

function buildGmailSendOptionalParams(): ToolDefinition["parameters"] {
  return {
    cc: {
      type: "string",
      description: "CC recipients (comma-separated)",
      required: false,
    },
    bcc: {
      type: "string",
      description: "BCC recipients (comma-separated)",
      required: false,
    },
  };
}

/** Build the gmail_send tool definition. */
export function buildGmailSendDef(): ToolDefinition {
  return {
    name: "gmail_send",
    description: "Send an email via Gmail. Composes and sends a new message.",
    parameters: {
      ...buildGmailSendRequiredParams(),
      ...buildGmailSendOptionalParams(),
    },
  };
}

/** Build the gmail_label tool definition. */
export function buildGmailLabelDef(): ToolDefinition {
  return {
    name: "gmail_label",
    description:
      "Add or remove labels from a Gmail message (e.g. mark as read, archive, star).",
    parameters: {
      message_id: {
        type: "string",
        description: "The Gmail message ID",
        required: true,
      },
      add_labels: {
        type: "string",
        description:
          "Comma-separated label IDs to add (e.g. 'STARRED,IMPORTANT')",
        required: false,
      },
      remove_labels: {
        type: "string",
        description:
          "Comma-separated label IDs to remove (e.g. 'UNREAD,INBOX')",
        required: false,
      },
    },
  };
}
