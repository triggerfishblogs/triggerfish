/**
 * Conversation persistence module — message store and types.
 *
 * @module
 */

export type {
  ConversationAppendInput,
  ConversationRecord,
  ConversationRole,
  LoadActiveOptions,
  MessageRetentionConfig,
  MessageStore,
} from "./conversation_types.ts";

export {
  convRecordKey,
  convSessionIndexKey,
  deserialiseConvRecord,
  estimateRecordTokens,
  serialiseConvRecord,
  truncateToolArgs,
} from "./conversation_serde.ts";

export { createMessageStore } from "./conversation_store.ts";
