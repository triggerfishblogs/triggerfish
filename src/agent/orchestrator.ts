/**
 * Agent orchestrator — the main agent loop.
 *
 * Receives messages from channels, fires enforcement hooks,
 * builds LLM context with SPINE.md, calls the LLM provider,
 * executes tool calls, and returns responses subject to policy checks.
 *
 * Uses prompt-based tool calling: tool definitions are embedded in the
 * system prompt and the LLM outputs structured JSON tool invocations.
 * This works universally across all LLM providers.
 *
 * @module
 */

import type { Result, ClassificationLevel } from "../core/types/classification.ts";
import { canFlowTo } from "../core/types/classification.ts";
import type { SessionState, SessionId } from "../core/types/session.ts";
import type { HookRunner } from "../core/policy/hooks.ts";
import type { LlmProviderRegistry, LlmMessage, LlmProvider } from "./llm.ts";
import { createCompactor } from "./compactor.ts";
import type { Compactor, CompactorConfig } from "./compactor.ts";
import type { MessageContent, ImageContentBlock, ContentBlock } from "../image/content.ts";
import { extractText, hasImages, normalizeContent } from "../image/content.ts";
import type { PlanManager } from "./plan.ts";
import { createPlanToolExecutor } from "./plan.ts";
import { buildPlanModePrompt, buildAwaitingApprovalPrompt, buildPlanExecutionPrompt } from "./plan_prompt.ts";

/** Default system prompt used when no SPINE.md is found. */
const DEFAULT_SYSTEM_PROMPT =
  "You are a helpful AI assistant powered by Triggerfish. " +
  "Follow the user's instructions and respond clearly and concisely.";

/** Maximum tool call iterations to prevent infinite loops. */
const MAX_TOOL_ITERATIONS = 25;

/** Iteration at which the LLM is warned to wrap up. */
const SOFT_LIMIT_ITERATIONS = 20;

/**
 * Pattern detecting leaked tool-intent narration in LLM responses.
 * Matches phrases like "I'll search", "Let me fetch", "I need to look up", etc.
 * Used as a defense-in-depth guard — the primary fix is prompt hardening.
 */
export const LEAKED_INTENT_PATTERN =
  /\b(?:(?:I(?:'ll| will| need to| should| can| am going to)\s+(?:search|fetch|look up|find|check|browse|retrieve|use web_))|(?:(?:Let|let) me (?:search|fetch|look|find|check|browse|retrieve|use))|(?:(?:We|I) need to (?:fetch|search|look up|find|check|browse|retrieve)))/i;

/** A tool definition for prompt-based tool calling. */
export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parameters: Readonly<Record<string, {
    readonly type: string;
    readonly description: string;
    readonly required?: boolean;
  }>>;
}

/** Handler that executes a tool call and returns the result text. */
export type ToolExecutor = (
  name: string,
  input: Record<string, unknown>,
) => Promise<string>;

/** Configuration for creating an orchestrator. */
export interface OrchestratorConfig {
  readonly hookRunner: HookRunner;
  readonly providerRegistry: LlmProviderRegistry;
  readonly spinePath?: string;
  /** Tool definitions available to the agent. */
  readonly tools?: readonly ToolDefinition[];
  /** Callback to execute tool calls. */
  readonly toolExecutor?: ToolExecutor;
  /** Event callback for real-time progress reporting. */
  readonly onEvent?: OrchestratorEventCallback;
  /** Configuration for conversation compactor. */
  readonly compactorConfig?: Partial<CompactorConfig>;
  /**
   * Additional system prompt sections injected by the platform.
   * Appended AFTER SPINE.md and tool definitions. SPINE.md remains
   * the foundation — these sections layer platform behaviour on top.
   */
  readonly systemPromptSections?: readonly string[];
  /** Plan manager for plan mode state tracking and tool execution. */
  readonly planManager?: PlanManager;
  /** Enable verbose logging of LLM responses and tool calls to stderr. */
  readonly debug?: boolean;
  /** Vision-capable LLM provider for describing images when the primary model lacks vision. */
  readonly visionProvider?: LlmProvider;
  /** Tool prefix → classification level. Enforced before every tool dispatch. */
  readonly toolClassifications?: ReadonlyMap<string, ClassificationLevel>;
  /** Read current session taint for canFlowTo checks. */
  readonly getSessionTaint?: () => ClassificationLevel;
  /** Escalate session taint after tool dispatch (upward only via maxClassification). */
  readonly escalateTaint?: (level: ClassificationLevel, reason: string) => void;
  /** Whether the active session belongs to the owner. */
  readonly isOwnerSession?: () => boolean;
  /**
   * Classification ceiling for the active non-owner session.
   * null = no explicit classification → all tools blocked.
   * Non-null = tools classified at or below this level are allowed.
   */
  readonly getNonOwnerCeiling?: () => ClassificationLevel | null;
}

/** Config shape for building integration/plugin/channel classification map. */
export interface ClassificationMapConfig {
  /** Google Workspace classification. */
  readonly google?: { readonly classification?: string };
  /** GitHub integration classification. */
  readonly github?: { readonly classification?: string };
  /** Plugins keyed by name — each with enabled + classification. */
  readonly plugins?: Readonly<Record<string, { readonly enabled?: boolean; readonly classification?: string } | undefined>>;
}

/**
 * Build tool prefix → classification map for integrations, plugins, and channels.
 *
 * Built-in tools are not in this map and pass through ungated.
 * Only external integrations, plugins, and channels are classified.
 */
export function buildToolClassifications(config: ClassificationMapConfig): Map<string, ClassificationLevel> {
  const m = new Map<string, ClassificationLevel>();

  // Google Workspace — gmail_, calendar_, drive_, sheets_, tasks_
  const googleClassification = (config.google?.classification ?? "PUBLIC") as ClassificationLevel;
  for (const prefix of ["gmail_", "calendar_", "drive_", "sheets_", "tasks_"]) {
    m.set(prefix, googleClassification);
  }

  // GitHub — all tools start with github_
  m.set("github_", (config.github?.classification ?? "PUBLIC") as ClassificationLevel);

  // Plugins — each plugin's tools use {pluginName}. prefix convention
  if (config.plugins) {
    for (const [name, pluginConfig] of Object.entries(config.plugins)) {
      const cfg = pluginConfig as { enabled?: boolean; classification?: string } | undefined;
      if (cfg?.enabled) {
        m.set(`${name}.`, (cfg.classification ?? "INTERNAL") as ClassificationLevel);
      }
    }
  }

  return m;
}

/** Options for processing a single message. */
export interface ProcessMessageOptions {
  readonly session: SessionState;
  readonly message: MessageContent;
  readonly targetClassification: ClassificationLevel;
  /** Optional signal to abort the operation. */
  readonly signal?: AbortSignal;
}

/** Successful response from message processing. */
export interface ProcessMessageResult {
  readonly response: string;
}

/** A conversation history entry. */
export interface HistoryEntry {
  readonly role: string;
  readonly content: MessageContent;
}

/** The orchestrator interface for processing messages. */
export interface Orchestrator {
  /** Process a user message through the full agent loop. */
  processMessage(
    options: ProcessMessageOptions,
  ): Promise<Result<ProcessMessageResult, string>>;
  /** Get conversation history for a session. */
  getHistory(sessionId: SessionId): readonly HistoryEntry[];
  /** Clear conversation history for a session. */
  clearHistory(sessionId: SessionId): void;
}

/** Events emitted by the orchestrator during message processing. */
export type OrchestratorEvent =
  | { readonly type: "llm_start"; readonly iteration: number; readonly maxIterations: number }
  | {
    readonly type: "llm_complete";
    readonly iteration: number;
    readonly hasToolCalls: boolean;
  }
  | {
    readonly type: "tool_call";
    readonly name: string;
    readonly args: Record<string, unknown>;
  }
  | {
    readonly type: "tool_result";
    readonly name: string;
    readonly result: string;
    readonly blocked: boolean;
  }
  | { readonly type: "response"; readonly text: string }
  | { readonly type: "vision_start"; readonly imageCount: number }
  | { readonly type: "vision_complete"; readonly imageCount: number };

/** Callback for real-time orchestrator event reporting. */
export type OrchestratorEventCallback = (event: OrchestratorEvent) => void;

/**
 * Load SPINE.md content from the filesystem.
 * Returns the file content or null if the file cannot be read.
 */
async function loadSpine(spinePath: string | undefined): Promise<string | null> {
  if (!spinePath) return null;
  try {
    return await Deno.readTextFile(spinePath);
  } catch {
    return null;
  }
}

/** A parsed tool call from LLM text output. */
interface ParsedToolCall {
  readonly name: string;
  readonly args: Record<string, unknown>;
}

/**
 * Build the tool-use instruction block for the system prompt.
 */
function buildToolPrompt(tools: readonly ToolDefinition[]): string {
  const toolDescs = tools.map((t) => {
    const params = Object.entries(t.parameters)
      .map(([name, info]) => {
        const req = info.required !== false ? " (required)" : " (optional)";
        return `    - ${name} (${info.type}${req}): ${info.description}`;
      })
      .join("\n");
    return `  ${t.name}: ${t.description}\n    Parameters:\n${params}`;
  }).join("\n\n");

  return `## Available Tools

You have access to the following tools. To use a tool, output a JSON block wrapped in [TOOL_CALL] and [/TOOL_CALL] markers. You may use multiple tools in a single response. After all tool results are returned, continue your response.

Format:
[TOOL_CALL]
{"name": "tool_name", "args": {"param1": "value1"}}
[/TOOL_CALL]

Tools:
${toolDescs}

Important: Use tools when the user asks you to interact with the filesystem, run commands, or search for files. After using tools, provide your answer based on the results. Never narrate your intent before using a tool — just emit the [TOOL_CALL] block directly.`;
}

/**
 * Extract arguments from a parsed tool call JSON object.
 * LLMs use varying key names for arguments: args, input, parameters, arguments.
 * Falls back to collecting all top-level keys except "name" as flat args.
 */
function extractArgs(parsed: Record<string, unknown>): Record<string, unknown> {
  // Check common arg container key names
  for (const key of ["args", "input", "parameters", "arguments"]) {
    const val = parsed[key];
    if (val !== null && val !== undefined && typeof val === "object" && !Array.isArray(val)) {
      return val as Record<string, unknown>;
    }
  }
  // Flat format: args are top-level siblings of "name"
  const { name: _, args: _a, input: _i, parameters: _p, arguments: _g, ...rest } = parsed;
  if (Object.keys(rest).length > 0) {
    return rest;
  }
  return {};
}

/**
 * Parse tool calls from LLM text output.
 * Looks for [TOOL_CALL]...[/TOOL_CALL] blocks containing JSON.
 * Also accepts legacy <tool_call>...</tool_call> XML tags for backwards compat.
 * Falls back to detecting bare JSON objects with a "name" field
 * (some models forget the tags).
 */
function parseToolCalls(text: string): readonly ParsedToolCall[] {
  const calls: ParsedToolCall[] = [];

  // Match [TOOL_CALL]...[/TOOL_CALL] (primary) and <tool_call>...</tool_call> (legacy)
  const patterns = [
    /\[TOOL_CALL\]\s*([\s\S]*?)\s*\[\/TOOL_CALL\]/g,
    /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/g,
  ];

  for (const regex of patterns) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed.name && typeof parsed.name === "string") {
          calls.push({
            name: parsed.name,
            args: extractArgs(parsed),
          });
        }
      } catch {
        // Skip malformed JSON
      }
    }
  }

  // Fallback: detect bare JSON tool calls without tags.
  // Only if no tagged calls were found and the entire text is a JSON object.
  if (calls.length === 0) {
    const trimmed = text.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.name && typeof parsed.name === "string") {
          calls.push({
            name: parsed.name,
            args: extractArgs(parsed),
          });
        }
      } catch {
        // Not valid JSON
      }
    }
  }

  return calls;
}

/**
 * Strip tool_call blocks from text to get the "clean" response.
 * Only removes blocks that contain valid JSON with a "name" key
 * (i.e. actual tool calls). Preserves content from malformed blocks
 * to avoid accidentally stripping the model's response.
 */
function stripToolCalls(text: string): string {
  // Strip both [TOOL_CALL] and legacy <tool_call> formats
  const stripPattern = (t: string, re: RegExp): string =>
    t.replace(re, (_match, inner: string) => {
      try {
        const parsed = JSON.parse(inner);
        if (parsed && typeof parsed.name === "string") {
          return ""; // Valid tool call — strip it
        }
      } catch {
        // Not valid JSON — preserve inner content
      }
      return inner;
    });

  let result = text;
  result = stripPattern(result, /\[TOOL_CALL\]\s*([\s\S]*?)\s*\[\/TOOL_CALL\]/g);
  result = stripPattern(result, /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/g);
  return result.trim();
}

/**
 * Create an agent orchestrator.
 *
 * The orchestrator implements the agent loop:
 * 1. Receive message from channel
 * 2. Fire PRE_CONTEXT_INJECTION hook
 * 3. Build LLM context with SPINE.md + tool instructions as system prompt
 * 4. Send to LLM provider
 * 5. Parse tool calls from text response
 * 6. If tool calls found: execute each, append results, call LLM again
 * 7. Repeat until no more tool calls (or max iterations)
 * 8. Fire PRE_OUTPUT on final text response
 * 9. Return response
 *
 * @param config - Orchestrator configuration
 * @returns An Orchestrator instance
 */
export function createOrchestrator(config: OrchestratorConfig): Orchestrator {
  const { hookRunner, providerRegistry, spinePath } = config;
  const tools = config.tools ?? [];
  const rawToolExecutor = config.toolExecutor;

  // Wrap tool executor with classification enforcement for integrations.
  // Only tools whose name matches a prefix in toolClassifications are gated.
  // Built-in tools (read_file, todo_, plan., etc.) have no entry and pass through.
  // Matched integrations: escalate taint on entry, block write-down via canFlowTo.
  const toolExecutor: ToolExecutor | undefined = rawToolExecutor
    ? async (name: string, input: Record<string, unknown>): Promise<string> => {
        // Non-owner tool access enforcement.
        if (config.isOwnerSession && !config.isOwnerSession()) {
          const ceiling = config.getNonOwnerCeiling?.() ?? null;

          // No explicit classification → all tools blocked.
          if (ceiling === null) {
            return `Error: Tool calls are not available in this session.`;
          }

          // Has explicit classification → only classified tools at or below ceiling.
          if (config.toolClassifications) {
            let matched = false;
            for (const [prefix, level] of config.toolClassifications) {
              if (name.startsWith(prefix)) {
                matched = true;
                if (!canFlowTo(level, ceiling)) {
                  return `Error: ${name} (classified ${level}) exceeds session ceiling ${ceiling}. Access denied.`;
                }
                break;
              }
            }
            // Unclassified tools (built-ins) are never available to non-owners.
            if (!matched) {
              return `Error: Tool calls are not available in this session.`;
            }
          }
        }

        if (config.toolClassifications && config.getSessionTaint) {
          for (const [prefix, level] of config.toolClassifications) {
            if (name.startsWith(prefix)) {
              // Write-down check: session taint must flow to integration level
              const currentTaint = config.getSessionTaint();
              if (!canFlowTo(currentTaint, level)) {
                return `Error: Session taint ${currentTaint} cannot flow to ${name} (classified ${level}). ` +
                  `Accessing a lower-classified tool from a higher-tainted session risks data leakage. ` +
                  `Use /clear to reset your session context and taint before using ${level}-classified tools.`;
              }
              // Escalate session taint to integration level
              if (config.escalateTaint) {
                config.escalateTaint(level, `Tool call: ${name}`);
              }
              break;
            }
          }
        }

        const result = await rawToolExecutor(name, input);

        // Post-call: escalate based on response-level classification
        // (e.g. GitHub per-repo classification in _classification field)
        if (config.escalateTaint) {
          try {
            const parsed = JSON.parse(result);
            const cls = parsed._classification;
            if (typeof cls === "string") {
              config.escalateTaint(cls as ClassificationLevel, `Tool response: ${name}`);
            }
          } catch { /* not JSON or no classification field */ }
        }

        return result;
      }
    : undefined;
  const systemPromptSections = config.systemPromptSections ?? [];
  const planManager = config.planManager;
  const visionProvider = config.visionProvider;
  const emit = config.onEvent ?? (() => {});
  const debug = config.debug ?? false;
  const histories = new Map<string, HistoryEntry[]>();
  const compactor: Compactor = createCompactor(config.compactorConfig);

  /** Log to stderr when debug mode is enabled. */
  function debugLog(label: string, data: unknown): void {
    if (!debug) return;
    const ts = new Date().toISOString().slice(11, 23);
    const str = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    const preview = str.length > 500 ? str.slice(0, 500) + `… [${str.length} chars]` : str;
    console.error(`[orch ${ts}] ${label}: ${preview}`);
  }

  /**
   * Describe images using the vision provider.
   * Returns a text description for each image block.
   */
  async function describeImages(
    images: readonly ImageContentBlock[],
    signal?: AbortSignal,
  ): Promise<readonly string[]> {
    const descriptions: string[] = [];
    for (const image of images) {
      const messages: LlmMessage[] = [
        {
          role: "user",
          content: [
            { type: "image", source: image.source },
            { type: "text", text: "Describe this image in detail. Be specific about what you see." },
          ],
        },
      ];
      try {
        const result = await visionProvider!.complete(messages, [], {
          ...(signal ? { signal } : {}),
        });
        descriptions.push(result.content);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        descriptions.push(`[Image description unavailable: ${msg}]`);
      }
    }
    return descriptions;
  }

  async function processMessage(
    options: ProcessMessageOptions,
  ): Promise<Result<ProcessMessageResult, string>> {
    const { session, message, targetClassification, signal } = options;

    // 1. Fire PRE_CONTEXT_INJECTION hook
    const preContextResult = await hookRunner.run("PRE_CONTEXT_INJECTION", {
      session,
      input: { content: extractText(message), source_type: "OWNER" },
    });

    if (!preContextResult.allowed) {
      return {
        ok: false,
        error: preContextResult.message ?? "Input blocked by policy",
      };
    }

    // Session key for history and plan state lookups
    const sessionKey = session.id as string;

    // 2. Get the default LLM provider
    const provider = providerRegistry.getDefault();
    if (!provider) {
      return { ok: false, error: "No default LLM provider configured" };
    }

    // 3. Build LLM context — load SPINE.md or use default prompt
    const spineContent = await loadSpine(spinePath);
    let systemPrompt = spineContent ?? DEFAULT_SYSTEM_PROMPT;

    // Append tool instructions if tools are available
    if (tools.length > 0 && toolExecutor) {
      systemPrompt += "\n\n" + buildToolPrompt(tools);
    }

    // Append platform-level sections (layered after SPINE.md + tools)
    for (const section of systemPromptSections) {
      systemPrompt += "\n\n" + section;
    }

    // Inject plan mode context based on current session plan state
    if (planManager) {
      const planState = planManager.getState(sessionKey);
      if (planState.mode === "plan" && planState.goal) {
        systemPrompt += "\n\n" + buildPlanModePrompt(planState.goal, planState.scope);
      }
      if (planState.mode === "awaiting_approval") {
        systemPrompt += "\n\n" + buildAwaitingApprovalPrompt();
      }
      if (planState.activePlan) {
        systemPrompt += "\n\n" + buildPlanExecutionPrompt(planState.activePlan);
      }
    }

    // Get or create conversation history for this session
    if (!histories.has(sessionKey)) {
      histories.set(sessionKey, []);
    }
    const history = histories.get(sessionKey)!;

    // Add user message to history
    history.push({ role: "user", content: message });

    // Vision fallback: describe images for non-vision primary models
    if (visionProvider && typeof message !== "string" && hasImages(message as readonly ContentBlock[])) {
      const blocks = normalizeContent(message);
      const images = blocks.filter(
        (b): b is ImageContentBlock => b.type === "image",
      );

      emit({ type: "vision_start", imageCount: images.length });
      debugLog("vision", `describing ${images.length} image(s) via vision provider`);

      const descriptions = await describeImages(images, signal);

      emit({ type: "vision_complete", imageCount: images.length });

      // Build text-only message: inline descriptions where images were
      const parts: string[] = [];
      let descIdx = 0;
      for (const block of blocks) {
        if (block.type === "image") {
          parts.push(
            `[The user shared an image. A vision model described it as follows: ${descriptions[descIdx++]}]`,
          );
        } else {
          parts.push(block.text);
        }
      }
      const textOnlyMessage = parts.join("\n\n");

      // Replace the last history entry with the text-only version
      history[history.length - 1] = { role: "user", content: textOnlyMessage };

      // Tell the LLM that image descriptions are already provided
      systemPrompt += "\n\n## Image Descriptions\n" +
        "The user's message may contain image descriptions provided by a vision model " +
        "in brackets like [The user shared an image. A vision model described it as follows: ...]. " +
        "Treat these descriptions as if you can see the images yourself. " +
        "Do NOT use image_analyze or any other tool to re-examine these images — the descriptions are already complete.";
    }

    // Auto-compact history if approaching context limits
    const compacted = compactor.compact(history);
    if (compacted.length < history.length) {
      history.length = 0;
      history.push(...compacted);
    }

    // 4. Agent loop — call LLM, parse tool calls, execute, repeat
    let iterations = 0;
    let emptyNudgeCount = 0; // Track empty-response recovery attempts
    const MAX_EMPTY_NUDGES = 2;
    while (iterations < MAX_TOOL_ITERATIONS) {
      iterations++;

      // Check abort signal
      if (signal?.aborted) {
        return { ok: false, error: "Operation cancelled by user" };
      }

      emit({ type: "llm_start", iteration: iterations, maxIterations: MAX_TOOL_ITERATIONS });

      // Build messages array: system prompt + conversation history
      const messages: LlmMessage[] = [
        { role: "system", content: systemPrompt },
        ...history,
      ];

      debugLog(`iter${iterations} sending`, `${messages.length} msgs, sysPrompt=${systemPrompt.length}chars, history=${history.length} entries`);
      if (debug && iterations === 1) {
        for (const h of history) {
          const preview = typeof h.content === "string" ? h.content.slice(0, 100) : "(non-string)";
          console.error(`[orch] history ${h.role}: ${preview}`);
        }
      }

      // Call LLM provider — pass native tool definitions for providers that support them
      const nativeTools = (tools.length > 0 && toolExecutor)
        ? tools.map((t) => ({
            type: "function" as const,
            function: {
              name: t.name,
              description: t.description,
              parameters: {
                type: "object" as const,
                properties: Object.fromEntries(
                  Object.entries(t.parameters).map(([k, v]) => [k, {
                    type: v.type,
                    description: v.description,
                  }]),
                ),
                required: Object.entries(t.parameters)
                  .filter(([_, v]) => v.required !== false)
                  .map(([k]) => k),
              },
            },
          }))
        : [];

      const completion = await provider.complete(messages, nativeTools, {
        ...(signal ? { signal } : {}),
      });

      debugLog(`iter${iterations} raw`, completion.content);

      // Parse tool calls: check native tool_calls first, then text-based
      const hasTools = (tools.length > 0 && toolExecutor) || planManager;
      let parsedCalls: readonly ParsedToolCall[] = [];

      // Check for native tool calls from provider (OpenAI-compatible format)
      if (hasTools && Array.isArray(completion.toolCalls) && completion.toolCalls.length > 0) {
        parsedCalls = completion.toolCalls
          .filter((tc: unknown): tc is { function: { name: string; arguments: string } } => {
            const t = tc as Record<string, unknown>;
            return t !== null && typeof t === "object" &&
              typeof (t as { function?: unknown }).function === "object";
          })
          .map((tc) => {
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(tc.function.arguments);
            } catch {
              // Malformed arguments
            }
            return { name: tc.function.name, args };
          });
        debugLog(`iter${iterations} nativeToolCalls`, parsedCalls.length);
      }

      // Fall back to text-based parsing if no native tool calls
      if (parsedCalls.length === 0 && hasTools) {
        parsedCalls = parseToolCalls(completion.content);
      }

      debugLog(`iter${iterations} parsedCalls`, parsedCalls.length);

      emit({
        type: "llm_complete",
        iteration: iterations,
        hasToolCalls: parsedCalls.length > 0,
      });

      if (parsedCalls.length === 0) {
        // No tool calls — this is the final response
        const finalText = stripToolCalls(completion.content);
        debugLog(`iter${iterations} finalText`, finalText || "(EMPTY)");

        // Recovery: if the model returned empty text, bare JSON gibberish,
        // or leaked tool intent (e.g. "We need to search web"), retry with
        // a nudge (up to MAX_EMPTY_NUDGES). Catches unreliable models.
        const isEmptyOrJunk = finalText.length === 0 ||
          (finalText.length < 200 && finalText.startsWith("{") && finalText.endsWith("}"));
        const isLeakedIntent = hasTools && finalText.length < 300 &&
          LEAKED_INTENT_PATTERN.test(finalText);
        if ((isEmptyOrJunk || isLeakedIntent) && emptyNudgeCount < MAX_EMPTY_NUDGES && iterations < MAX_TOOL_ITERATIONS) {
          emptyNudgeCount++;
          debugLog(`iter${iterations}`, `${isLeakedIntent ? "leaked intent" : "junk/empty"} (${finalText.length} chars) — nudge ${emptyNudgeCount}/${MAX_EMPTY_NUDGES}`);
          // Don't push empty assistant messages into history
          if (completion.content.trim().length > 0) {
            history.push({ role: "assistant", content: completion.content });
          }
          const nudge = isLeakedIntent
            ? "[SYSTEM] You described your intent but didn't use a tool. Do not narrate — use the tool directly by outputting a [TOOL_CALL] block. For web searches, use: [TOOL_CALL]{\"name\": \"web_search\", \"args\": {\"query\": \"your search terms\"}}[/TOOL_CALL]"
            : (emptyNudgeCount === 1
              ? "[SYSTEM] Your response was empty. Please respond to the user's message with a helpful answer. If the user asked you to search or look something up, use the web_search tool."
              : "[SYSTEM] Your previous response was still empty. You MUST write a natural language response. Summarize what you know and answer the user directly.");
          history.push({ role: "user", content: nudge });
          continue;
        }

        // If the model returned empty/junk after exhausting nudges, provide a fallback
        const isJunkFinal = finalText.length === 0 || isEmptyOrJunk || isLeakedIntent;
        const responseText = isJunkFinal && emptyNudgeCount >= MAX_EMPTY_NUDGES
          ? "I'm sorry, I wasn't able to generate a response. The language model returned empty or malformed output. This may be a temporary issue — please try again, or consider switching to a more capable model (e.g. google/gemini-2.0-flash-001)."
          : finalText;

        // Fire PRE_OUTPUT hook
        const preOutputResult = await hookRunner.run("PRE_OUTPUT", {
          session,
          input: {
            content: responseText,
            target_classification: targetClassification,
          },
        });

        if (!preOutputResult.allowed) {
          return {
            ok: false,
            error: preOutputResult.message ?? "Output blocked by policy",
          };
        }

        emit({ type: "response", text: responseText });

        // Add assistant response to history
        history.push({ role: "assistant", content: responseText.length > 0 ? responseText : completion.content });

        return {
          ok: true,
          value: { response: responseText },
        };
      }

      // Tool calls found — add assistant message to history
      // If the model used native tool calls and content is empty, synthesize
      // a text-based representation so the history stays coherent
      const assistantContent = completion.content.trim().length > 0
        ? completion.content
        : parsedCalls.map((c) =>
            `[TOOL_CALL]\n${JSON.stringify({ name: c.name, args: c.args })}\n[/TOOL_CALL]`
          ).join("\n");
      history.push({ role: "assistant", content: assistantContent });

      // Inject soft limit warning to help the LLM wrap up
      if (iterations === SOFT_LIMIT_ITERATIONS) {
        history.push({
          role: "user",
          content:
            `[SYSTEM] You have used many tool calls (${iterations}/${MAX_TOOL_ITERATIONS}). ` +
            `You have ${MAX_TOOL_ITERATIONS - iterations} remaining iterations. ` +
            "Please provide your best answer now based on the information gathered so far. " +
            "If you cannot find what you're looking for, say so rather than continuing to search.",
        });
      }

      // Execute each tool call and build results
      const resultParts: string[] = [];
      for (const call of parsedCalls) {
        // Check abort signal before each tool execution
        if (signal?.aborted) {
          return { ok: false, error: "Operation cancelled by user" };
        }

        emit({ type: "tool_call", name: call.name, args: call.args });

        let resultText: string;
        let blocked = false;

        // Plan mode tool blocking (defense-in-depth)
        if (planManager && planManager.isToolBlocked(sessionKey, call.name)) {
          resultText = `Tool "${call.name}" is blocked in plan mode. ` +
            `Use plan.exit to present your implementation plan first.`;
          blocked = true;
        } else if (planManager) {
          // Try plan tools first (returns null if not a plan tool)
          const planExecutor = createPlanToolExecutor(planManager, sessionKey);
          const planResult = await planExecutor(call.name, call.args);
          if (planResult !== null) {
            resultText = planResult;
          } else {
            // Not a plan tool — fire PRE_TOOL_CALL hook then external executor
            const preToolResult = await hookRunner.run("PRE_TOOL_CALL", {
              session,
              input: { tool_call: call },
            });
            if (!preToolResult.allowed) {
              resultText = `Tool call blocked by policy: ${preToolResult.message ?? "denied"}`;
              blocked = true;
            } else {
              resultText = await toolExecutor!(call.name, call.args);
            }
          }
        } else {
          // No plan manager — original behavior
          const preToolResult = await hookRunner.run("PRE_TOOL_CALL", {
            session,
            input: { tool_call: call },
          });
          if (!preToolResult.allowed) {
            resultText = `Tool call blocked by policy: ${preToolResult.message ?? "denied"}`;
            blocked = true;
          } else {
            resultText = await toolExecutor!(call.name, call.args);
          }
        }

        emit({
          type: "tool_result",
          name: call.name,
          result: resultText,
          blocked,
        });
        resultParts.push(`[TOOL_RESULT name="${call.name}"]\n${resultText}\n[/TOOL_RESULT]`);
      }

      // Add tool results as a user message
      history.push({ role: "user", content: resultParts.join("\n\n") });
    }

    // Exceeded max iterations
    return {
      ok: false,
      error: "Agent loop exceeded maximum tool call iterations",
    };
  }

  function getHistory(sessionId: SessionId): readonly HistoryEntry[] {
    const sessionKey = sessionId as string;
    return histories.get(sessionKey) ?? [];
  }

  function clearHistory(sessionId: SessionId): void {
    histories.delete(sessionId as string);
  }

  return { processMessage, getHistory, clearHistory };
}
