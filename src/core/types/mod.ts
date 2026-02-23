/**
 * Core types module — classification levels, session state, and taint management.
 *
 * @module
 */

export type {
  ClassificationLevel,
  Result,
} from "./classification.ts";

export {
  CLASSIFICATION_ORDER,
  canFlowTo,
  compareClassification,
  maxClassification,
  minClassification,
  parseClassification,
} from "./classification.ts";

export type {
  ChannelId,
  CreateSessionOptions,
  SessionId,
  SessionState,
  TaintEvent,
  UserId,
} from "./session.ts";

export {
  canOutput,
  createSession,
  resetSession,
  updateTaint,
} from "./session.ts";

export type {
  ToolDefinition,
  ToolExecutor,
} from "./tool.ts";

export type {
  LlmMessage,
  LlmUsage,
  LlmCompletionResult,
  LlmStreamChunk,
  LlmProvider,
  LlmProviderRegistry,
} from "./llm.ts";

export type {
  DomainClassificationResult,
  DomainClassifier,
} from "./domain.ts";

export type {
  Orchestrator,
  ProcessMessageOptions,
  ProcessMessageResult,
  HistoryEntry,
  CompactResult,
} from "./orchestrator.ts";

export type {
  NotificationPriority,
  Notification,
  DeliverOptions,
  DeliveryChannel,
  NotificationService,
} from "./notification.ts";

export type {
  ChatEvent,
  ChatClientMessage,
  ChatEventSender,
} from "./chat_event.ts";
