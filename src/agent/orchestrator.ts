/**
 * Agent orchestrator — the main agent loop.
 *
 * Receives messages from channels, fires enforcement hooks,
 * builds LLM context with SPINE.md, calls the LLM provider,
 * executes tool calls, and returns responses subject to policy checks.
 *
 * Uses native tool calling: tool definitions are passed to providers via
 * their API (OpenAI tools format). All supported providers handle native
 * tool calls, so text-based fallback is not needed.
 *
 * Sub-modules:
 * - orchestrator_types.ts: Public types, events, constants, classification map builder
 *
 * @module
 */

import { createLogger } from "../core/logger/mod.ts";
import type {
  ClassificationLevel,
  Result,
} from "../core/types/classification.ts";
import { canFlowTo } from "../core/types/classification.ts";
import { resolveSecretRefs } from "../core/secrets/resolver.ts";
import {
  FILESYSTEM_READ_TOOLS,
  FILESYSTEM_WRITE_TOOLS,
  URL_READ_TOOLS,
  URL_WRITE_TOOLS,
} from "../core/security/constants.ts";
import type { SessionId } from "../core/types/session.ts";
import type { SessionState } from "../core/types/session.ts";
import type { LlmMessage, LlmProvider } from "./llm.ts";
import {
  countTokens,
  createCompactor,
  estimateHistoryTokens,
} from "./compactor.ts";
import type { Compactor, CompactResult } from "./compactor.ts";
import type { ContentBlock, ImageContentBlock } from "../core/image/content.ts";
import type { MessageContent } from "../core/image/content.ts";
import {
  extractText,
  hasImages,
  normalizeContent,
} from "../core/image/content.ts";
import { createPlanToolExecutor } from "./plan/plan.ts";
import type { PlanManager } from "./plan/plan.ts";
import {
  buildAwaitingApprovalPrompt,
  buildPlanExecutionPrompt,
  buildPlanModePrompt,
} from "./plan/prompt.ts";
import type {
  HistoryEntry,
  Orchestrator,
  OrchestratorConfig,
  OrchestratorEventCallback,
  ParsedToolCall,
  ProcessMessageOptions,
  ProcessMessageResult,
  ToolDefinition,
  ToolExecutor,
} from "./orchestrator_types.ts";
import {
  DEFAULT_SYSTEM_PROMPT,
  LEAKED_INTENT_PATTERN,
  MAX_TOOL_ITERATIONS,
  SOFT_LIMIT_ITERATIONS,
} from "./orchestrator_types.ts";

// Re-export full public API from types module for backward compatibility
export type {
  ClassificationMapConfig,
  HistoryEntry,
  Orchestrator,
  OrchestratorConfig,
  OrchestratorEvent,
  OrchestratorEventCallback,
  ParsedToolCall,
  ProcessMessageOptions,
  ProcessMessageResult,
  ToolDefinition,
  ToolExecutor,
} from "./orchestrator_types.ts";

export {
  DEFAULT_SYSTEM_PROMPT,
  LEAKED_INTENT_PATTERN,
  mapToolPrefixClassifications,
  MAX_TOOL_ITERATIONS,
  SOFT_LIMIT_ITERATIONS,
} from "./orchestrator_types.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

/** Computed security context returned alongside the hook input. */
interface SecurityContext {
  readonly toolName: string;
  readonly toolFloor: ClassificationLevel | null;
  readonly resourceClassification: ClassificationLevel | null;
  readonly operationType: "read" | "write" | null;
  readonly isOwner: boolean;
  /** True when the active session is a trigger session. */
  readonly isTrigger: boolean;
  readonly nonOwnerCeiling: ClassificationLevel | null;
  readonly resourceParam: string | null;
}

/** Mutable per-iteration token accumulator. */
interface TokenAccumulator {
  inputTokens: number;
  outputTokens: number;
}

/** Shared orchestrator state passed to extracted helpers. */
interface OrchestratorState {
  readonly config: OrchestratorConfig;
  readonly baseTools: readonly ToolDefinition[];
  readonly getExtraTools: (() => readonly ToolDefinition[]) | undefined;
  readonly getExtraSystemPromptSections: (() => readonly string[]) | undefined;
  readonly baseSystemPromptSections: readonly string[];
  readonly planManager: PlanManager | undefined;
  readonly visionProvider: LlmProvider | undefined;
  readonly emit: OrchestratorEventCallback;
  readonly debug: boolean;
  readonly orchLog: ReturnType<typeof createLogger>;
  readonly compactor: Compactor;
  readonly histories: Map<string, HistoryEntry[]>;
  readonly toolExecutor: ToolExecutor | undefined;
}

// ─── SPINE.md loader ─────────────────────────────────────────────────────────

/**
 * Load SPINE.md content from the filesystem.
 * Returns the file content or null if the file cannot be read.
 */
async function readSpineFromDisk(
  spinePath: string | undefined,
): Promise<string | null> {
  if (!spinePath) return null;
  try {
    return await Deno.readTextFile(spinePath);
  } catch (err: unknown) {
    const log = createLogger("orchestrator");
    log.debug("SPINE.md not readable", {
      path: spinePath,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

// ─── Tool format conversion ──────────────────────────────────────────────────

/** Convert a single tool parameter definition to OpenAI property format. */
function convertParameterToProperty(
  v: ToolDefinition["parameters"][string],
): Record<string, unknown> {
  const prop: Record<string, unknown> = {
    type: v.type,
    description: v.description,
  };
  if (v.items) prop.items = v.items;
  if (v.enum) prop.enum = v.enum;
  return prop;
}

/** Extract required parameter names from a tool definition. */
function extractRequiredParameterNames(
  parameters: ToolDefinition["parameters"],
): string[] {
  return Object.entries(parameters)
    .filter(([_, v]) => v.required !== false)
    .map(([k]) => k);
}

/** Convert a single tool definition to OpenAI native format. */
function convertSingleToolToNativeFormat(t: ToolDefinition) {
  return {
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: {
        type: "object" as const,
        properties: Object.fromEntries(
          Object.entries(t.parameters).map(
            ([k, v]) => [k, convertParameterToProperty(v)],
          ),
        ),
        required: extractRequiredParameterNames(t.parameters),
      },
    },
  };
}

/** Convert tool definitions to OpenAI native tool format for LLM providers. */
function convertToolsToNativeFormat(tools: readonly ToolDefinition[]) {
  return tools.map(convertSingleToolToNativeFormat);
}

// ─── Tool call parsing ───────────────────────────────────────────────────────

/** Try parsing an OpenAI-format tool call. */
function parseOpenAiToolCall(
  t: Record<string, unknown>,
  orchLog: ReturnType<typeof createLogger>,
): ParsedToolCall | null {
  if (typeof (t as { function?: unknown }).function !== "object") return null;
  const fn = (t as { function: { name: string; arguments: string } }).function;
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(fn.arguments);
  } catch (parseErr: unknown) {
    orchLog.warn("Tool call arguments malformed", {
      tool: fn.name,
      error: parseErr instanceof Error ? parseErr.message : String(parseErr),
    });
  }
  return { name: fn.name, args };
}

/** Try parsing an Anthropic-format tool call. */
function parseAnthropicToolCall(
  t: Record<string, unknown>,
): ParsedToolCall | null {
  if (t.type !== "tool_use" || typeof t.name !== "string") return null;
  const input = (t.input ?? {}) as Record<string, unknown>;
  return { name: t.name as string, args: input };
}

/** Parse native tool calls from LLM provider response. */
function parseNativeToolCalls(
  rawCalls: readonly unknown[],
  orchLog: ReturnType<typeof createLogger>,
): ParsedToolCall[] {
  return rawCalls
    .map((tc: unknown): ParsedToolCall | null => {
      const t = tc as Record<string, unknown>;
      if (t === null || typeof t !== "object") return null;
      return parseOpenAiToolCall(t, orchLog) ?? parseAnthropicToolCall(t);
    })
    .filter((tc): tc is ParsedToolCall => tc !== null);
}

// ─── Access control helpers ──────────────────────────────────────────────────

/** Check trigger tool access ceiling. Returns error message or null. */
function enforceTriggerToolCeiling(
  name: string,
  ceiling: ClassificationLevel | null,
  toolClassifications:
    | ReadonlyMap<string, ClassificationLevel>
    | undefined,
): string | null {
  if (ceiling === null || !toolClassifications) return null;
  for (const [prefix, level] of toolClassifications) {
    if (name.startsWith(prefix)) {
      if (!canFlowTo(level, ceiling)) {
        return `Error: ${name} (classified ${level}) exceeds trigger ceiling ${ceiling}. Access denied.`;
      }
      break;
    }
  }
  return null;
}

/** Check non-owner tool access ceiling. Returns error message or null. */
function enforceNonOwnerToolCeiling(
  name: string,
  ceiling: ClassificationLevel | null,
  toolClassifications:
    | ReadonlyMap<string, ClassificationLevel>
    | undefined,
): string | null {
  if (ceiling === null) {
    return `Error: Tool calls are not available in this session.`;
  }
  if (!toolClassifications) return null;
  let matched = false;
  for (const [prefix, level] of toolClassifications) {
    if (name.startsWith(prefix)) {
      matched = true;
      if (!canFlowTo(level, ceiling)) {
        return `Error: ${name} (classified ${level}) exceeds session ceiling ${ceiling}. Access denied.`;
      }
      break;
    }
  }
  if (!matched) {
    return `Error: Tool calls are not available in this session.`;
  }
  return null;
}

/** Escalate session taint when calling a classified tool prefix. */
function escalateToolPrefixTaint(
  name: string,
  toolClassifications:
    | ReadonlyMap<string, ClassificationLevel>
    | undefined,
  escalateTaint:
    | ((level: ClassificationLevel, reason: string) => void)
    | undefined,
): void {
  if (!toolClassifications || !escalateTaint) return;
  for (const [prefix, level] of toolClassifications) {
    if (name.startsWith(prefix)) {
      escalateTaint(level, `Tool call: ${name}`);
      break;
    }
  }
}

/** Escalate taint from _classification field in tool response JSON. */
function escalateResponseClassification(
  result: string,
  escalateTaint:
    | ((level: ClassificationLevel, reason: string) => void)
    | undefined,
  toolName: string,
): void {
  if (!escalateTaint) return;
  try {
    const parsed = JSON.parse(result);
    const cls = parsed._classification;
    if (typeof cls === "string") {
      escalateTaint(cls as ClassificationLevel, `Tool response: ${toolName}`);
    }
  } catch {
    /* Not JSON or no _classification — expected for most tools */
  }
}

// ─── Security context assembly ───────────────────────────────────────────────

/** No-classification sentinel result. */
const NO_RESOURCE_CLASSIFICATION = {
  classification: null,
  operation: null,
  param: null,
} as const;

/** Resource classification result shape. */
type ResourceClassResult = {
  classification: ClassificationLevel | null;
  operation: "read" | "write" | null;
  param: string | null;
};

/** Extract the path parameter from tool call arguments. */
function extractPathParam(call: ParsedToolCall): string | null {
  return (call.args.path ?? call.args.directory ?? call.args.search_path) as
    | string
    | null ?? null;
}

/** Classify a resource using a classifier and known tool sets. */
function classifyResourceByToolSets(
  toolName: string,
  param: string,
  classifier: { classify(p: string): { classification: ClassificationLevel } },
  readSet: ReadonlySet<string>,
  writeSet: ReadonlySet<string>,
): ResourceClassResult {
  if (readSet.has(toolName)) {
    return {
      classification: classifier.classify(param).classification,
      operation: "read",
      param,
    };
  }
  if (writeSet.has(toolName)) {
    return {
      classification: classifier.classify(param).classification,
      operation: "write",
      param,
    };
  }
  return NO_RESOURCE_CLASSIFICATION;
}

/** Classify a filesystem path tool call. */
function classifyFilesystemResource(
  call: ParsedToolCall,
  config: OrchestratorConfig,
): ResourceClassResult {
  const pathParam = extractPathParam(call);
  if (!config.pathClassifier || !pathParam) return NO_RESOURCE_CLASSIFICATION;
  return classifyResourceByToolSets(
    call.name,
    pathParam,
    config.pathClassifier,
    FILESYSTEM_READ_TOOLS,
    FILESYSTEM_WRITE_TOOLS,
  );
}

/** Classify a URL-based tool call. */
function classifyUrlResource(
  call: ParsedToolCall,
  config: OrchestratorConfig,
): ResourceClassResult {
  const urlParam = (call.args.url) as string | undefined ?? null;
  if (!config.domainClassifier || !urlParam) return NO_RESOURCE_CLASSIFICATION;
  return classifyResourceByToolSets(
    call.name,
    urlParam,
    config.domainClassifier,
    URL_READ_TOOLS,
    URL_WRITE_TOOLS,
  );
}

/** Build identity context fields for the hook input. */
function assembleIdentityContext(config: OrchestratorConfig): {
  isOwner: boolean;
  isTrigger: boolean;
  nonOwnerCeiling: ClassificationLevel | null;
} {
  return {
    isOwner: config.isOwnerSession?.() ?? false,
    isTrigger: config.isTriggerSession?.() ?? false,
    nonOwnerCeiling: config.getNonOwnerCeiling?.() ?? null,
  };
}

/** Resolve resource classification from filesystem or URL tools. */
function resolveResourceClassification(
  call: ParsedToolCall,
  config: OrchestratorConfig,
): ResourceClassResult {
  const fsResult = classifyFilesystemResource(call, config);
  if (fsResult.classification !== null) return fsResult;
  return classifyUrlResource(call, config);
}

/** Populate hook input with resource and identity fields. */
function populateHookInputFields(
  hookInput: Record<string, unknown>,
  resource: ResourceClassResult,
  identity: {
    isOwner: boolean;
    isTrigger: boolean;
    nonOwnerCeiling: ClassificationLevel | null;
  },
): void {
  if (resource.classification !== null) {
    hookInput.resource_classification = resource.classification;
    hookInput.operation_type = resource.operation;
  }
  hookInput.is_owner = identity.isOwner;
  hookInput.is_trigger = identity.isTrigger;
  if (identity.nonOwnerCeiling !== null) {
    hookInput.non_owner_ceiling = identity.nonOwnerCeiling;
  }
}

/** Build enriched hook input for PRE_TOOL_CALL with security context. */
function assembleSecurityContext(
  call: ParsedToolCall,
  config: OrchestratorConfig,
): { input: Record<string, unknown>; ctx: SecurityContext } {
  const hookInput: Record<string, unknown> = { tool_call: call };
  const toolName = call.name;
  const toolFloor = config.toolFloorRegistry?.getFloor(toolName) ?? null;
  if (toolFloor !== null) hookInput.tool_floor = toolFloor;

  const resource = resolveResourceClassification(call, config);
  const identity = assembleIdentityContext(config);
  populateHookInputFields(hookInput, resource, identity);

  return {
    input: hookInput,
    ctx: {
      toolName,
      toolFloor,
      resourceClassification: resource.classification,
      operationType: resource.operation,
      resourceParam: resource.param,
      ...identity,
    },
  };
}

// ─── Policy block explanation ────────────────────────────────────────────────

/** Render tool-floor enforcement error. */
function renderToolFloorError(
  ctx: SecurityContext,
  sessionTaint: ClassificationLevel,
): string {
  return `Error: "${ctx.toolName}" requires a minimum session taint of ${ctx.toolFloor}. ` +
    `Your current session taint is ${sessionTaint}. ` +
    `Access higher-classified data first to escalate your session taint, ` +
    `or use a tool that doesn't require ${ctx.toolFloor} clearance.`;
}

/** Render resource write-down error. */
function renderWriteDownError(
  ctx: SecurityContext,
  sessionTaint: ClassificationLevel,
): string {
  return `Error: Write-down blocked — your session taint is ${sessionTaint}, ` +
    `but the target resource${
      ctx.resourceParam ? ` "${ctx.resourceParam}"` : ""
    } is classified ${ctx.resourceClassification}. ` +
    `A ${sessionTaint}-tainted session cannot write to ${ctx.resourceClassification}-level destinations. ` +
    `Use /clear to reset your session context and taint before writing to ${ctx.resourceClassification}-classified resources.`;
}

/** Render resource read-ceiling error. */
function renderReadCeilingError(ctx: SecurityContext): string {
  return `Error: Access denied — the resource${
    ctx.resourceParam ? ` "${ctx.resourceParam}"` : ""
  } is classified ${ctx.resourceClassification}, ` +
    `which exceeds your session ceiling of ${ctx.nonOwnerCeiling}. ` +
    `You do not have permission to access ${ctx.resourceClassification}-classified resources.`;
}

/** Build a detailed error message for a blocked tool call. */
function renderPolicyBlockExplanation(
  ruleId: string | null,
  ctx: SecurityContext,
  sessionTaint: ClassificationLevel,
): string {
  switch (ruleId) {
    case "tool-floor-enforcement":
      return renderToolFloorError(ctx, sessionTaint);
    case "resource-write-down":
      return renderWriteDownError(ctx, sessionTaint);
    case "resource-read-ceiling":
      return renderReadCeilingError(ctx);
    case "no-write-down":
      return `Error: Write-down blocked — your session taint is ${sessionTaint}, ` +
        `which exceeds the target classification. ` +
        `Use /clear to reset your session context and taint before outputting to lower-classified channels.`;
    default:
      return `Tool call blocked by policy: ${ruleId ?? "denied"}`;
  }
}

// ─── Tool executor wrapper ───────────────────────────────────────────────────

/** Enforce access control for trigger sessions. */
function enforceAccessControl(
  name: string,
  config: OrchestratorConfig,
): string | null {
  const isActiveTrigger = config.isTriggerSession?.() ?? false;
  if (isActiveTrigger) {
    return enforceTriggerToolCeiling(
      name,
      config.getNonOwnerCeiling?.() ?? null,
      config.toolClassifications,
    );
  }
  if (config.isOwnerSession && !config.isOwnerSession()) {
    return enforceNonOwnerToolCeiling(
      name,
      config.getNonOwnerCeiling?.() ?? null,
      config.toolClassifications,
    );
  }
  return null;
}

/** Resolve secret references in tool input, returning error or resolved input. */
async function resolveToolSecrets(
  input: Record<string, unknown>,
  config: OrchestratorConfig,
): Promise<{ resolved: Record<string, unknown>; error: string | null }> {
  if (!config.secretStore) return { resolved: input, error: null };
  const resolution = await resolveSecretRefs(input, config.secretStore);
  if (!resolution.ok) return { resolved: input, error: null };
  if (resolution.value.missing.length > 0) {
    return {
      resolved: input,
      error:
        `Error: The following secrets were referenced but not found in the secret store: ${
          resolution.value.missing.map((n) => `'${n}'`).join(", ")
        }. Use secret_save to store them first.`,
    };
  }
  return { resolved: resolution.value.resolved, error: null };
}

/** Create the classification-enforcing tool executor wrapper. */
function wrapToolExecutorWithEnforcement(
  rawToolExecutor: ToolExecutor,
  config: OrchestratorConfig,
): ToolExecutor {
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string> => {
    const accessErr = enforceAccessControl(name, config);
    if (accessErr) return accessErr;

    escalateToolPrefixTaint(
      name,
      config.toolClassifications,
      config.escalateTaint,
    );

    const { resolved, error } = await resolveToolSecrets(input, config);
    if (error) return error;

    const result = await rawToolExecutor(name, resolved);
    escalateResponseClassification(result, config.escalateTaint, name);
    return result;
  };
}

// ─── System prompt assembly ──────────────────────────────────────────────────

/** Append platform-level system prompt sections after SPINE.md. */
function appendSystemPromptSections(
  base: string,
  sections: readonly string[],
): string {
  let prompt = base;
  for (const section of sections) {
    prompt += "\n\n" + section;
  }
  return prompt;
}

/** Inject plan mode context into the system prompt. */
function appendPlanModeContext(
  systemPrompt: string,
  planManager: PlanManager,
  sessionKey: string,
): string {
  const planState = planManager.getState(sessionKey);
  let prompt = systemPrompt;
  if (planState.mode === "plan" && planState.goal) {
    prompt += "\n\n" + buildPlanModePrompt(planState.goal, planState.scope);
  }
  if (planState.mode === "awaiting_approval") {
    prompt += "\n\n" + buildAwaitingApprovalPrompt();
  }
  if (planState.activePlan) {
    prompt += "\n\n" + buildPlanExecutionPrompt(planState.activePlan);
  }
  return prompt;
}

/** Build the full system prompt for an agent turn. */
async function buildFullSystemPrompt(
  state: OrchestratorState,
  sessionKey: string,
): Promise<string> {
  const spineContent = await readSpineFromDisk(state.config.spinePath);
  let systemPrompt = spineContent ?? DEFAULT_SYSTEM_PROMPT;

  const effectiveSections = state.getExtraSystemPromptSections
    ? [
      ...state.baseSystemPromptSections,
      ...state.getExtraSystemPromptSections(),
    ]
    : state.baseSystemPromptSections;
  systemPrompt = appendSystemPromptSections(systemPrompt, effectiveSections);

  if (state.planManager) {
    systemPrompt = appendPlanModeContext(
      systemPrompt,
      state.planManager,
      sessionKey,
    );
  }
  return systemPrompt;
}

// ─── Vision fallback ─────────────────────────────────────────────────────────

/** Build a vision description request message for a single image. */
function buildImageDescriptionMessage(
  image: ImageContentBlock,
): LlmMessage {
  return {
    role: "user",
    content: [
      { type: "image", source: image.source },
      {
        type: "text",
        text: "Describe this image in detail. Be specific about what you see.",
      },
    ],
  };
}

/** Describe a single image using the vision provider. */
async function describeImageWithVisionProvider(
  image: ImageContentBlock,
  visionProvider: LlmProvider,
  signal?: AbortSignal,
): Promise<string> {
  try {
    const result = await visionProvider.complete(
      [buildImageDescriptionMessage(image)],
      [],
      { ...(signal ? { signal } : {}) },
    );
    return result.content;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `[Image description unavailable: ${msg}]`;
  }
}

/** Describe multiple images using the vision provider. */
async function transcribeImagesForNonVisionModel(
  images: readonly ImageContentBlock[],
  visionProvider: LlmProvider,
  signal?: AbortSignal,
): Promise<readonly string[]> {
  const descriptions: string[] = [];
  for (const image of images) {
    descriptions.push(
      await describeImageWithVisionProvider(image, visionProvider, signal),
    );
  }
  return descriptions;
}

/** Build text-only message by inlining vision descriptions where images were. */
function buildTextOnlyFromImageDescriptions(
  blocks: readonly ContentBlock[],
  descriptions: readonly string[],
): string {
  const parts: string[] = [];
  let descIdx = 0;
  for (const block of blocks) {
    if (block.type === "image") {
      parts.push(
        `[The user shared an image. A vision model described it as follows: ${
          descriptions[descIdx++]
        }]`,
      );
    } else {
      parts.push(block.text);
    }
  }
  return parts.join("\n\n");
}

/** The image-description addendum appended to the system prompt. */
const IMAGE_DESCRIPTION_ADDENDUM = "\n\n## Image Descriptions\n" +
  "The user's message may contain image descriptions provided by a vision model " +
  "in brackets like [The user shared an image. A vision model described it as follows: ...]. " +
  "Treat these descriptions as if you can see the images yourself. " +
  "Do NOT use image_analyze or any other tool to re-examine these images — the descriptions are already complete.";

/** Process vision fallback: describe images and replace history entry. */
async function processVisionFallback(
  state: OrchestratorState,
  message: MessageContent,
  history: HistoryEntry[],
  signal: AbortSignal | undefined,
): Promise<string> {
  if (!state.visionProvider || typeof message === "string") return "";
  if (!hasImages(message as readonly ContentBlock[])) return "";

  const blocks = normalizeContent(message);
  const images = blocks.filter(
    (b): b is ImageContentBlock => b.type === "image",
  );

  state.emit({ type: "vision_start", imageCount: images.length });
  const descriptions = await transcribeImagesForNonVisionModel(
    images,
    state.visionProvider,
    signal,
  );
  state.emit({ type: "vision_complete", imageCount: images.length });

  const textOnly = buildTextOnlyFromImageDescriptions(blocks, descriptions);
  history[history.length - 1] = { role: "user", content: textOnly };
  return IMAGE_DESCRIPTION_ADDENDUM;
}

// ─── Empty/junk response recovery ────────────────────────────────────────────

/** Detect whether the final text is empty, bare JSON junk, or leaked intent. */
function classifyResponseQuality(
  finalText: string,
  hasTools: boolean,
): { isEmptyOrJunk: boolean; isLeakedIntent: boolean } {
  const isEmptyOrJunk = finalText.length === 0 ||
    (finalText.length < 200 && finalText.startsWith("{") &&
      finalText.endsWith("}"));
  const isLeakedIntent = hasTools && finalText.length < 300 &&
    LEAKED_INTENT_PATTERN.test(finalText);
  return { isEmptyOrJunk, isLeakedIntent };
}

/** Build the nudge message for empty/junk or leaked-intent responses. */
function buildRecoveryNudge(
  isLeakedIntent: boolean,
  nudgeCount: number,
): string {
  if (isLeakedIntent) {
    return "[SYSTEM] You described your intent but didn't use a tool. Use the tools provided to you directly instead of narrating what you plan to do.";
  }
  if (nudgeCount === 1) {
    return "[SYSTEM] Your response was empty. Please respond to the user's message with a helpful answer. If the user asked you to search or look something up, use the web_search tool.";
  }
  return "[SYSTEM] Your previous response was still empty. You MUST write a natural language response. Summarize what you know and answer the user directly.";
}

/** The fallback response when the model returns empty/junk after all nudges. */
const FALLBACK_RESPONSE =
  "I'm sorry, I wasn't able to generate a response. The language model returned empty or malformed output. " +
  "This may be a temporary issue — please try again, or consider switching to a more capable model (e.g. google/gemini-2.0-flash-001).";

// ─── PRE_OUTPUT hook ─────────────────────────────────────────────────────────

/** Fire PRE_OUTPUT hook and return the result. */
async function evaluatePreOutputHook(
  config: OrchestratorConfig,
  session: SessionState,
  responseText: string,
  targetClassification: ClassificationLevel,
): Promise<Result<void, string>> {
  const outputTaint = config.getSessionTaint?.() ?? session.taint;
  const outputSession = outputTaint !== session.taint
    ? { ...session, taint: outputTaint }
    : session;
  const isOwnerOutput = config.isOwnerSession !== undefined &&
    config.isOwnerSession();
  const effectiveTarget = isOwnerOutput ? outputTaint : targetClassification;

  const result = await config.hookRunner.evaluateHook("PRE_OUTPUT", {
    session: outputSession,
    input: {
      content: responseText,
      target_classification: effectiveTarget,
    },
  });
  if (!result.allowed) {
    return { ok: false, error: result.message ?? "Output blocked by policy" };
  }
  return { ok: true, value: undefined };
}

// ─── Tool call execution ─────────────────────────────────────────────────────

/** Check plan mode blocking and execute plan tools. */
async function executePlanModeToolCall(
  planManager: PlanManager,
  sessionKey: string,
  call: ParsedToolCall,
): Promise<{ resultText: string | undefined; blocked: boolean }> {
  if (planManager.isToolBlocked(sessionKey, call.name)) {
    return {
      resultText: `Tool "${call.name}" is blocked in plan mode. ` +
        `Use plan.exit to present your implementation plan first.`,
      blocked: true,
    };
  }
  const planExecutor = createPlanToolExecutor(planManager, sessionKey);
  const planResult = await planExecutor(call.name, call.args);
  if (planResult !== null) {
    return { resultText: planResult, blocked: false };
  }
  return { resultText: undefined, blocked: false };
}

/** Pre-escalate taint for owner/trigger resource access. */
function preEscalateOwnerTriggerTaint(
  secCtx: SecurityContext,
  config: OrchestratorConfig,
  call: ParsedToolCall,
): void {
  if (
    secCtx.resourceClassification === null ||
    (!secCtx.isOwner && !secCtx.isTrigger) ||
    !config.escalateTaint
  ) return;
  config.escalateTaint(
    secCtx.resourceClassification,
    `${call.name}: ${secCtx.resourceParam}`,
  );
}

/** Check integration write-down (session taint vs tool classification). */
function checkIntegrationWriteDown(
  call: ParsedToolCall,
  config: OrchestratorConfig,
): { resultText: string | undefined; blocked: boolean } {
  if (!config.toolClassifications || !config.getSessionTaint) {
    return { resultText: undefined, blocked: false };
  }
  const integrationTaint = config.getSessionTaint();
  for (const [prefix, level] of config.toolClassifications) {
    if (call.name.startsWith(prefix)) {
      if (!canFlowTo(integrationTaint, level)) {
        return {
          resultText:
            `Error: Session taint ${integrationTaint} cannot flow to ${call.name} (classified ${level}). ` +
            `Accessing a lower-classified tool from a higher-tainted session risks data leakage. ` +
            `Use /clear to reset your session context and taint before using ${level}-classified tools.`,
          blocked: true,
        };
      }
      break;
    }
  }
  return { resultText: undefined, blocked: false };
}

/** Post-hook escalation for non-owner sessions. */
function escalateNonOwnerResourceTaint(
  secCtx: SecurityContext,
  config: OrchestratorConfig,
  call: ParsedToolCall,
): void {
  if (
    secCtx.resourceClassification === null || secCtx.isOwner ||
    secCtx.isTrigger || !config.escalateTaint
  ) return;
  config.escalateTaint(
    secCtx.resourceClassification,
    `${call.name}: ${secCtx.resourceParam}`,
  );
}

/** Evaluate PRE_TOOL_CALL hook with real-time session taint. */
async function evaluatePreToolCallHook(
  config: OrchestratorConfig,
  session: SessionState,
  secInput: Record<string, unknown>,
) {
  const currentTaint = config.getSessionTaint?.() ?? session.taint;
  const hookSession = currentTaint !== session.taint
    ? { ...session, taint: currentTaint }
    : session;
  const result = await config.hookRunner.evaluateHook("PRE_TOOL_CALL", {
    session: hookSession,
    input: secInput,
  });
  return { result, currentTaint };
}

/** Execute the tool after policy approval (write-down + escalation + dispatch). */
async function executeAfterPolicyApproval(
  call: ParsedToolCall,
  config: OrchestratorConfig,
  secCtx: SecurityContext,
  toolExecutor: ToolExecutor,
): Promise<{ resultText: string; blocked: boolean }> {
  const writeDown = checkIntegrationWriteDown(call, config);
  if (writeDown.resultText !== undefined) {
    return { resultText: writeDown.resultText, blocked: writeDown.blocked };
  }
  escalateNonOwnerResourceTaint(secCtx, config, call);
  return {
    resultText: await toolExecutor(call.name, call.args),
    blocked: false,
  };
}

/** Execute a single tool call through the full security pipeline. */
async function executeSecurityEnforcedToolCall(
  call: ParsedToolCall,
  config: OrchestratorConfig,
  session: SessionState,
  toolExecutor: ToolExecutor,
): Promise<{ resultText: string; blocked: boolean }> {
  const { input: secInput, ctx: secCtx } = assembleSecurityContext(
    call,
    config,
  );
  preEscalateOwnerTriggerTaint(secCtx, config, call);

  const { result: preToolResult, currentTaint } = await evaluatePreToolCallHook(
    config,
    session,
    secInput,
  );

  if (!preToolResult.allowed) {
    return {
      resultText: renderPolicyBlockExplanation(
        preToolResult.ruleId,
        secCtx,
        currentTaint,
      ),
      blocked: true,
    };
  }
  return executeAfterPolicyApproval(call, config, secCtx, toolExecutor);
}

/** Dispatch a single tool call (plan mode + security). */
async function dispatchSingleToolCall(
  call: ParsedToolCall,
  orchestratorState: OrchestratorState,
  config: OrchestratorConfig,
  session: SessionState,
  sessionKey: string,
): Promise<{ resultText: string; blocked: boolean }> {
  if (orchestratorState.planManager) {
    const planResult = await executePlanModeToolCall(
      orchestratorState.planManager,
      sessionKey,
      call,
    );
    if (planResult.resultText !== undefined) {
      return { resultText: planResult.resultText, blocked: planResult.blocked };
    }
  }

  return executeSecurityEnforcedToolCall(
    call,
    config,
    session,
    orchestratorState.toolExecutor!,
  );
}

/** Execute a single tool call with event emission and format the result. */
async function executeAndFormatToolCall(
  call: ParsedToolCall,
  orchestratorState: OrchestratorState,
  session: SessionState,
  sessionKey: string,
): Promise<string> {
  orchestratorState.emit({
    type: "tool_call",
    name: call.name,
    args: call.args,
  });
  const { resultText, blocked } = await dispatchSingleToolCall(
    call,
    orchestratorState,
    orchestratorState.config,
    session,
    sessionKey,
  );
  orchestratorState.emit({
    type: "tool_result",
    name: call.name,
    result: resultText,
    blocked,
  });
  return `[TOOL_RESULT name="${call.name}"]\n${resultText}\n[/TOOL_RESULT]`;
}

/** Process all tool calls for one iteration and return result parts. */
async function processToolCallBatch(
  parsedCalls: readonly ParsedToolCall[],
  orchestratorState: OrchestratorState,
  session: SessionState,
  sessionKey: string,
  signal: AbortSignal | undefined,
): Promise<Result<string[], string>> {
  const resultParts: string[] = [];
  for (const call of parsedCalls) {
    if (signal?.aborted) {
      return { ok: false, error: "Operation cancelled by user" };
    }
    resultParts.push(
      await executeAndFormatToolCall(
        call,
        orchestratorState,
        session,
        sessionKey,
      ),
    );
  }
  return { ok: true, value: resultParts };
}

// ─── Debug logging ───────────────────────────────────────────────────────────

/** Log to the structured logger at TRACE level. */
function traceLog(
  orchLog: ReturnType<typeof createLogger>,
  debug: boolean,
  label: string,
  data: unknown,
): void {
  if (!debug) return;
  const str = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  const preview = str.length > 500
    ? str.slice(0, 500) + `... [${str.length} chars]`
    : str;
  orchLog.trace(`${label}: ${preview}`);
}

/** Log first-iteration debug details (system prompt + history preview). */
function logFirstIterationDetails(
  orchLog: ReturnType<typeof createLogger>,
  debug: boolean,
  systemPrompt: string,
  history: readonly HistoryEntry[],
): void {
  if (!debug) return;
  orchLog.trace(
    `=== SYSTEM PROMPT ===\n${systemPrompt}\n=== END SYSTEM PROMPT ===`,
  );
  for (const h of history) {
    const preview = typeof h.content === "string"
      ? h.content.slice(0, 100)
      : "(non-string)";
    orchLog.trace(`history ${h.role}: ${preview}`);
  }
}

// ─── LLM iteration ──────────────────────────────────────────────────────────

/** Build the LLM messages array from system prompt and history. */
function buildLlmMessages(
  systemPrompt: string,
  history: readonly HistoryEntry[],
): LlmMessage[] {
  return [{ role: "system", content: systemPrompt }, ...history];
}

/** Resolve the live tool list for this iteration. */
function resolveActiveToolList(
  state: OrchestratorState,
): readonly ToolDefinition[] {
  return state.getExtraTools
    ? [...state.baseTools, ...state.getExtraTools()]
    : state.baseTools;
}

/** Inject soft limit warning into history when approaching max iterations. */
function injectSoftLimitWarning(
  history: HistoryEntry[],
  iterations: number,
): void {
  if (iterations !== SOFT_LIMIT_ITERATIONS) return;
  history.push({
    role: "user",
    content:
      `[SYSTEM] You have used many tool calls (${iterations}/${MAX_TOOL_ITERATIONS}). ` +
      `You have ${MAX_TOOL_ITERATIONS - iterations} remaining iterations. ` +
      "Please provide your best answer now based on the information gathered so far. " +
      "If you cannot find what you're looking for, say so rather than continuing to search.",
  });
}

// ─── History compaction helpers ──────────────────────────────────────────────

/** Compact history using sliding-window strategy (no LLM). */
function compactHistoryWithSlidingWindow(
  history: HistoryEntry[],
  compactor: Compactor,
  messagesBefore: number,
  tokensBefore: number,
): CompactResult {
  const compacted = [...compactor.compact(history)];
  history.length = 0;
  history.push(...compacted);
  return {
    messagesBefore,
    messagesAfter: history.length,
    tokensBefore,
    tokensAfter: estimateHistoryTokens(history),
  };
}

/** Compact history using LLM-based summarization. */
async function compactHistoryWithSummarization(
  history: HistoryEntry[],
  compactor: Compactor,
  provider: LlmProvider,
  messagesBefore: number,
  tokensBefore: number,
): Promise<CompactResult> {
  const summarized = [...await compactor.summarize(history, provider)];
  history.length = 0;
  history.push(...summarized);
  return {
    messagesBefore,
    messagesAfter: history.length,
    tokensBefore,
    tokensAfter: estimateHistoryTokens(history),
  };
}

// ─── Agent turn: final response handling ─────────────────────────────────────

/** Handle the final text response (no tool calls). */
async function handleFinalResponse(
  finalText: string,
  completion: { content: string },
  hasTools: boolean,
  emptyNudgeCount: number,
  state: OrchestratorState,
  session: SessionState,
  history: HistoryEntry[],
  targetClassification: ClassificationLevel,
  tokens: TokenAccumulator,
): Promise<Result<ProcessMessageResult, string> | null> {
  const { isEmptyOrJunk, isLeakedIntent } = classifyResponseQuality(
    finalText,
    hasTools,
  );
  const isJunkFinal = finalText.length === 0 || isEmptyOrJunk || isLeakedIntent;
  const responseText = isJunkFinal && emptyNudgeCount >= 2
    ? FALLBACK_RESPONSE
    : finalText;

  const hookResult = await evaluatePreOutputHook(
    state.config,
    session,
    responseText,
    targetClassification,
  );
  if (!hookResult.ok) {
    return { ok: false, error: hookResult.error };
  }

  state.emit({ type: "response", text: responseText });
  history.push({
    role: "assistant",
    content: responseText.length > 0 ? responseText : completion.content,
  });

  return {
    ok: true,
    value: {
      response: responseText,
      tokenUsage: {
        inputTokens: tokens.inputTokens,
        outputTokens: tokens.outputTokens,
      },
    },
  };
}

// ─── Orchestrator factory ────────────────────────────────────────────────────

/**
 * Create an agent orchestrator.
 *
 * The orchestrator implements the agent loop:
 * 1. Receive message from channel
 * 2. Fire PRE_CONTEXT_INJECTION hook
 * 3. Build LLM context with SPINE.md as system prompt
 * 4. Send to LLM provider with native tool definitions
 * 5. Parse native tool calls from provider response
 * 6. If tool calls found: execute each, append results, call LLM again
 * 7. Repeat until no more tool calls (or max iterations)
 * 8. Fire PRE_OUTPUT on final text response
 * 9. Return response
 *
 * @param config - Orchestrator configuration
 * @returns An Orchestrator instance
 */
/** Derive effective context budget and create the compactor. */
function initializeCompactor(config: OrchestratorConfig): Compactor {
  const provider0 = config.providerRegistry.getDefault();
  const effectiveBudget = config.compactorConfig?.contextBudget ??
    provider0?.contextWindow ?? 100_000;
  return createCompactor({
    ...config.compactorConfig,
    contextBudget: effectiveBudget,
  });
}

/** Build the shared orchestrator state from config. */
function buildOrchestratorState(
  config: OrchestratorConfig,
  compactor: Compactor,
  histories: Map<string, HistoryEntry[]>,
): OrchestratorState {
  return {
    config,
    baseTools: config.tools ?? [],
    getExtraTools: config.getExtraTools,
    getExtraSystemPromptSections: config.getExtraSystemPromptSections,
    baseSystemPromptSections: config.systemPromptSections ?? [],
    planManager: config.planManager,
    visionProvider: config.visionProvider,
    emit: config.onEvent ?? (() => {}),
    debug: config.debug ?? false,
    orchLog: createLogger("orchestrator"),
    compactor,
    histories,
    toolExecutor: config.toolExecutor
      ? wrapToolExecutorWithEnforcement(config.toolExecutor, config)
      : undefined,
  };
}

export function createOrchestrator(config: OrchestratorConfig): Orchestrator {
  const histories = new Map<string, HistoryEntry[]>();
  const compactor = initializeCompactor(config);
  const state = buildOrchestratorState(config, compactor, histories);

  return {
    executeAgentTurn: (options) => runAgentTurn(state, options),
    getHistory: (id) => histories.get(id as string) ?? [],
    clearHistory: (id) => histories.delete(id as string),
    compactHistory: (id) =>
      compactSessionHistory(id, histories, config.providerRegistry, compactor),
  };
}

// ─── Agent turn implementation ───────────────────────────────────────────────

/** Fire PRE_CONTEXT_INJECTION hook. */
async function firePreContextHook(
  config: OrchestratorConfig,
  session: SessionState,
  message: MessageContent,
): Promise<Result<void, string>> {
  const result = await config.hookRunner.evaluateHook(
    "PRE_CONTEXT_INJECTION",
    {
      session,
      input: { content: extractText(message), source_type: "OWNER" },
    },
  );
  if (!result.allowed) {
    return { ok: false, error: result.message ?? "Input blocked by policy" };
  }
  return { ok: true, value: undefined };
}

/** Get or create conversation history for a session. */
function ensureSessionHistory(
  histories: Map<string, HistoryEntry[]>,
  sessionKey: string,
): HistoryEntry[] {
  if (!histories.has(sessionKey)) {
    histories.set(sessionKey, []);
  }
  return histories.get(sessionKey)!;
}

/** Auto-compact history if approaching context limits. */
function autoCompactHistory(
  history: HistoryEntry[],
  compactor: Compactor,
  systemPromptTokens: number,
): void {
  const compacted = compactor.compact(history, systemPromptTokens);
  if (compacted.length < history.length) {
    history.length = 0;
    history.push(...compacted);
  }
}

/** Run a single LLM iteration and return the completion. */
async function runLlmIteration(
  state: OrchestratorState,
  systemPrompt: string,
  history: readonly HistoryEntry[],
  iterations: number,
  signal: AbortSignal | undefined,
) {
  const provider = state.config.providerRegistry.getDefault()!;
  const messages = buildLlmMessages(systemPrompt, history);

  traceLog(
    state.orchLog,
    state.debug,
    `iter${iterations} sending`,
    `${messages.length} msgs, sysPrompt=${systemPrompt.length}chars, history=${history.length} entries`,
  );
  if (iterations === 1) {
    logFirstIterationDetails(state.orchLog, state.debug, systemPrompt, history);
  }

  const tools = resolveActiveToolList(state);
  const nativeTools = (tools.length > 0 && state.toolExecutor)
    ? convertToolsToNativeFormat(tools)
    : [];

  const completion = await provider.complete(messages, nativeTools, {
    ...(signal ? { signal } : {}),
  });
  return { completion, tools };
}

/** Prepare system prompt, history, and vision fallback for the turn. */
async function prepareAgentTurnContext(
  state: OrchestratorState,
  sessionKey: string,
  message: MessageContent,
  signal: AbortSignal | undefined,
): Promise<{ systemPrompt: string; history: HistoryEntry[] }> {
  let systemPrompt = await buildFullSystemPrompt(state, sessionKey);
  const history = ensureSessionHistory(state.histories, sessionKey);
  history.push({ role: "user", content: message });

  const visionAddendum = await processVisionFallback(
    state,
    message,
    history,
    signal,
  );
  if (visionAddendum) systemPrompt += visionAddendum;

  autoCompactHistory(history, state.compactor, countTokens(systemPrompt));
  return { systemPrompt, history };
}

/** Validate pre-conditions for an agent turn: run pre-context hook and verify provider. */
async function validateAgentTurnPreconditions(
  config: OrchestratorConfig,
  session: SessionState,
  message: MessageContent,
): Promise<Result<true, string>> {
  const hookResult = await firePreContextHook(config, session, message);
  if (!hookResult.ok) return hookResult;
  if (!config.providerRegistry.getDefault()) {
    return { ok: false, error: "No default LLM provider configured" };
  }
  return { ok: true, value: true };
}

/** Run the full agent turn loop. */
async function runAgentTurn(
  state: OrchestratorState,
  options: ProcessMessageOptions,
): Promise<Result<ProcessMessageResult, string>> {
  const { session, message, targetClassification, signal } = options;
  const guard = await validateAgentTurnPreconditions(
    state.config,
    session,
    message,
  );
  if (!guard.ok) return guard;

  const sessionKey = session.id as string;
  const ctx = await prepareAgentTurnContext(state, sessionKey, message, signal);
  return runAgentLoop(
    state,
    session,
    ctx.systemPrompt,
    ctx.history,
    sessionKey,
    targetClassification,
    signal,
  );
}

/** Accumulate token usage and log iteration stats. */
function accumulateTokenUsage(
  tokens: TokenAccumulator,
  completion: { usage: { inputTokens: number; outputTokens: number } },
  iterations: number,
  orchLog: ReturnType<typeof createLogger>,
): void {
  tokens.inputTokens += completion.usage.inputTokens;
  tokens.outputTokens += completion.usage.outputTokens;
  orchLog.debug(
    `iter${iterations} tokens — input: ${completion.usage.inputTokens}, output: ${completion.usage.outputTokens}, cumulative: ${tokens.inputTokens}+${tokens.outputTokens}`,
  );
}

/** Parse tool calls from completion and determine tool availability. */
function parseCompletionToolCalls(
  completion: { toolCalls?: readonly unknown[] },
  tools: readonly ToolDefinition[],
  state: OrchestratorState,
): { parsedCalls: readonly ParsedToolCall[]; hasTools: boolean } {
  const hasTools = !!(tools.length > 0 && state.toolExecutor) ||
    !!state.planManager;
  let parsedCalls: readonly ParsedToolCall[] = [];
  if (
    hasTools && Array.isArray(completion.toolCalls) &&
    completion.toolCalls.length > 0
  ) {
    parsedCalls = parseNativeToolCalls(completion.toolCalls, state.orchLog);
  }
  return { parsedCalls, hasTools };
}

/** Mutable nudge counter passed between iterations. */
interface NudgeState {
  count: number;
}

/** Bundled context for a single agent loop iteration. */
interface AgentLoopContext {
  readonly state: OrchestratorState;
  readonly session: SessionState;
  readonly systemPrompt: string;
  readonly history: HistoryEntry[];
  readonly sessionKey: string;
  readonly targetClassification: ClassificationLevel;
  readonly signal: AbortSignal | undefined;
  readonly tokens: TokenAccumulator;
  readonly nudge: NudgeState;
}

/** Result of a single agent loop iteration. */
type IterationOutcome =
  | { action: "continue" }
  | { action: "return"; result: Result<ProcessMessageResult, string> };

/** Successful LLM iteration result. */
type LlmIterationResult = Awaited<ReturnType<typeof runLlmIteration>>;

/** Result of calling the LLM in the agent loop: success with completion, or abort. */
type LlmCallOutcome =
  | {
    ok: true;
    completion: LlmIterationResult["completion"];
    tools: LlmIterationResult["tools"];
  }
  | { ok: false; result: Result<ProcessMessageResult, string> };

/** Abort sentinel for cancelled operations. */
const CANCELLED_RESULT: LlmCallOutcome = {
  ok: false,
  result: { ok: false, error: "Operation cancelled by user" },
};

/** Emit event, call LLM, accumulate tokens, and check abort. */
async function callLlmAndRecordUsage(
  ctx: AgentLoopContext,
  iterations: number,
): Promise<LlmCallOutcome> {
  ctx.state.emit({
    type: "llm_start",
    iteration: iterations,
    maxIterations: MAX_TOOL_ITERATIONS,
  });
  const { completion, tools } = await runLlmIteration(
    ctx.state,
    ctx.systemPrompt,
    ctx.history,
    iterations,
    ctx.signal,
  );
  accumulateTokenUsage(ctx.tokens, completion, iterations, ctx.state.orchLog);
  if (ctx.signal?.aborted) return CANCELLED_RESULT;
  traceLog(
    ctx.state.orchLog,
    ctx.state.debug,
    `iter${iterations} raw`,
    completion.content,
  );
  return { ok: true, completion, tools };
}

/** Emit completion event and trace parsed tool call count. */
function emitToolCallParseResult(
  ctx: AgentLoopContext,
  parsedCalls: readonly ParsedToolCall[],
  iterations: number,
): void {
  traceLog(
    ctx.state.orchLog,
    ctx.state.debug,
    `iter${iterations} parsedCalls`,
    parsedCalls.length,
  );
  ctx.state.emit({
    type: "llm_complete",
    iteration: iterations,
    hasToolCalls: parsedCalls.length > 0,
  });
}

/** Dispatch tool call execution and convert result to iteration outcome. */
async function dispatchToolCallExecution(
  ctx: AgentLoopContext,
  parsedCalls: readonly ParsedToolCall[],
  completion: { content: string },
  iterations: number,
): Promise<IterationOutcome> {
  const toolResult = await handleToolCallsIteration(
    parsedCalls,
    completion,
    ctx.state,
    ctx.session,
    ctx.history,
    ctx.sessionKey,
    iterations,
    ctx.signal,
  );
  if (!toolResult.ok) {
    return { action: "return", result: toolResult };
  }
  return { action: "continue" };
}

/** Parse tool calls from LLM output, trace results, and dispatch to appropriate handler. */
async function dispatchIterationOutcome(
  ctx: AgentLoopContext,
  completion: { content: string; toolCalls?: readonly unknown[] },
  tools: readonly ToolDefinition[],
  iterations: number,
): Promise<IterationOutcome> {
  const { parsedCalls, hasTools } = parseCompletionToolCalls(
    completion,
    tools,
    ctx.state,
  );
  emitToolCallParseResult(ctx, parsedCalls, iterations);

  if (parsedCalls.length === 0) {
    return await handleNoToolCallsIteration(
      completion,
      hasTools,
      ctx.nudge,
      iterations,
      ctx.state,
      ctx.session,
      ctx.history,
      ctx.targetClassification,
      ctx.tokens,
    );
  }

  return await dispatchToolCallExecution(
    ctx,
    parsedCalls,
    completion,
    iterations,
  );
}

/** Handle the case when no tool calls were returned. Returns 'continue' to nudge, a result, or null. */
async function handleNoToolCallsIteration(
  completion: { content: string },
  hasTools: boolean,
  nudge: NudgeState,
  iterations: number,
  state: OrchestratorState,
  session: SessionState,
  history: HistoryEntry[],
  targetClassification: ClassificationLevel,
  tokens: TokenAccumulator,
): Promise<
  { action: "continue" } | {
    action: "return";
    result: Result<ProcessMessageResult, string>;
  }
> {
  const finalText = completion.content.trim();
  traceLog(
    state.orchLog,
    state.debug,
    `iter${iterations} finalText`,
    finalText || "(EMPTY)",
  );

  const { isEmptyOrJunk, isLeakedIntent } = classifyResponseQuality(
    finalText,
    hasTools,
  );
  if (
    (isEmptyOrJunk || isLeakedIntent) &&
    nudge.count < 2 && iterations < MAX_TOOL_ITERATIONS
  ) {
    nudge.count++;
    if (completion.content.trim().length > 0) {
      history.push({ role: "assistant", content: completion.content });
    }
    history.push({
      role: "user",
      content: buildRecoveryNudge(isLeakedIntent, nudge.count),
    });
    return { action: "continue" };
  }

  const result = await handleFinalResponse(
    finalText,
    completion,
    hasTools,
    nudge.count,
    state,
    session,
    history,
    targetClassification,
    tokens,
  );
  if (result) return { action: "return", result };
  return {
    action: "return",
    result: { ok: false, error: "No response generated" },
  };
}

/** Append tool call results to history and return early on abort. */
async function handleToolCallsIteration(
  parsedCalls: readonly ParsedToolCall[],
  completion: { content: string },
  state: OrchestratorState,
  session: SessionState,
  history: HistoryEntry[],
  sessionKey: string,
  iterations: number,
  signal: AbortSignal | undefined,
): Promise<Result<void, string>> {
  const assistantContent = completion.content.trim().length > 0
    ? completion.content
    : `[Used tools: ${parsedCalls.map((c) => c.name).join(", ")}]`;
  history.push({ role: "assistant", content: assistantContent });

  injectSoftLimitWarning(history, iterations);

  const batchResult = await processToolCallBatch(
    parsedCalls,
    state,
    session,
    sessionKey,
    signal,
  );
  if (!batchResult.ok) return batchResult;

  history.push({ role: "user", content: batchResult.value.join("\n\n") });
  return { ok: true, value: undefined };
}

/** Build the agent loop context from turn parameters. */
function buildAgentLoopContext(
  state: OrchestratorState,
  session: SessionState,
  systemPrompt: string,
  history: HistoryEntry[],
  sessionKey: string,
  targetClassification: ClassificationLevel,
  signal: AbortSignal | undefined,
): AgentLoopContext {
  return {
    state,
    session,
    systemPrompt,
    history,
    sessionKey,
    targetClassification,
    signal,
    tokens: { inputTokens: 0, outputTokens: 0 },
    nudge: { count: 0 },
  };
}

/** The main agent loop: call LLM, parse tool calls, execute, repeat. */
async function runAgentLoop(
  state: OrchestratorState,
  session: SessionState,
  systemPrompt: string,
  history: HistoryEntry[],
  sessionKey: string,
  targetClassification: ClassificationLevel,
  signal: AbortSignal | undefined,
): Promise<Result<ProcessMessageResult, string>> {
  const ctx = buildAgentLoopContext(
    state,
    session,
    systemPrompt,
    history,
    sessionKey,
    targetClassification,
    signal,
  );
  for (let i = 1; i <= MAX_TOOL_ITERATIONS; i++) {
    if (signal?.aborted) {
      return { ok: false, error: "Operation cancelled by user" };
    }
    const llmResult = await callLlmAndRecordUsage(ctx, i);
    if (!llmResult.ok) return llmResult.result;
    const outcome = await dispatchIterationOutcome(
      ctx,
      llmResult.completion,
      llmResult.tools,
      i,
    );
    if (outcome.action === "continue") continue;
    return outcome.result;
  }
  return {
    ok: false,
    error: "Agent loop exceeded maximum tool call iterations",
  };
}

// ─── compactSessionHistory ───────────────────────────────────────────────────

/** Sentinel result for empty conversation history. */
const EMPTY_COMPACT_RESULT: CompactResult = {
  messagesBefore: 0,
  messagesAfter: 0,
  tokensBefore: 0,
  tokensAfter: 0,
};

/** Compact a session's history using summarization or sliding-window fallback. */
async function compactSessionHistory(
  sessionId: SessionId,
  histories: Map<string, HistoryEntry[]>,
  providerRegistry: OrchestratorConfig["providerRegistry"],
  compactor: Compactor,
): Promise<CompactResult> {
  const history = histories.get(sessionId as string) ?? [];
  if (history.length === 0) return EMPTY_COMPACT_RESULT;

  const messagesBefore = history.length;
  const tokensBefore = estimateHistoryTokens(history);
  const provider = providerRegistry.getDefault();

  if (!provider) {
    return compactHistoryWithSlidingWindow(
      history,
      compactor,
      messagesBefore,
      tokensBefore,
    );
  }
  return await compactHistoryWithSummarization(
    history,
    compactor,
    provider,
    messagesBefore,
    tokensBefore,
  );
}
