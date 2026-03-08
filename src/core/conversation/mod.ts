/**
 * Conversation persistence module — message store and serialisation.
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

export { createMessageStore } from "./conversation_store.ts";

export {
  convRecordKey,
  convSessionIndexKey,
  convSessionPrefix,
  deserialiseConvRecord,
  estimateRecordTokens,
  serialiseConvRecord,
} from "./conversation_serde.ts";
