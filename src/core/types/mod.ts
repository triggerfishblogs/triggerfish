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
