import { getToolsForProfile, getPromptsForProfile, TOOL_GROUPS } from "./src/gateway/agent_tools.ts";

const tools = getToolsForProfile("triggerSession");
console.log(`\nTotal tools in triggerSession: ${tools.length}\n`);

const profile = ["exec", "todo", "memory", "web", "google", "github", "llmTask", "summarize", "healthcheck", "trigger", "skills", "cron"] as const;
for (const g of profile) {
  const groupTools = TOOL_GROUPS[g]();
  console.log(`  ${g}: ${groupTools.length} tools — ${groupTools.map(t => t.name).join(", ")}`);
}

// Tool definitions as OpenAI function format (what actually gets sent)
const openAiTools = tools.map(t => ({
  type: "function",
  function: {
    name: t.name,
    description: t.description,
    parameters: {
      type: "object",
      properties: t.parameters,
      required: Object.entries(t.parameters).filter(([_, v]) => (v as {required?: boolean}).required).map(([k]) => k),
    },
  },
}));
const toolJson = JSON.stringify(openAiTools);
console.log(`\nTool definitions JSON: ${toolJson.length} chars ≈ ${Math.round(toolJson.length / 4)} tokens`);

// System prompts
const prompts = getPromptsForProfile("triggerSession");
const promptText = prompts.join("\n\n");
console.log(`System prompt sections: ${prompts.length} sections, ${promptText.length} chars ≈ ${Math.round(promptText.length / 4)} tokens`);

// Total estimate
const totalChars = toolJson.length + promptText.length;
console.log(`\nEstimated tool+prompt tokens: ~${Math.round(totalChars / 4)}`);
console.log(`(This doesn't include SPINE.md, TRIGGER.md content, skills prompt, or TRIGGER_SESSION_SYSTEM_PROMPT)`);
