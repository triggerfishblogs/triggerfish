/**
 * Self-healing system prompt section — injected into the workflow system prompt.
 * @module
 */

/** LLM guidance for self-healing workflow creation and configuration. */
export const SELF_HEALING_SYSTEM_PROMPT = `
**Self-healing:** Workflows can have an autonomous healing agent that watches execution, triages failures, and proposes fixes. When creating a workflow, ALWAYS ask the user if they want self-healing enabled. If yes, add a \`metadata.triggerfish.self_healing\` block and ensure every step has the 3 required metadata fields.

Self-healing config (in workflow metadata):
\`\`\`yaml
metadata:
  triggerfish:
    self_healing:
      enabled: true
      retry_budget: 3            # max intervention attempts (default 3)
      approval_required: true     # require human approval for fixes (default true)
      pause_on_intervention: blocking_only  # always | never | blocking_only
      pause_timeout_seconds: 300  # seconds before timeout policy triggers
      pause_timeout_policy: escalate_and_halt  # escalate_and_halt | escalate_and_skip | escalate_and_fail
      notify_on: [intervention, escalation, approval_required]
\`\`\`

When self-healing is enabled, EVERY step MUST have these 3 metadata fields:
\`\`\`yaml
- name: fetch-data
  call: http
  with:
    method: GET
    endpoint: https://api.example.com/data
  metadata:
    description: "What this step does and why"
    expects: "What input/preconditions this step needs"
    produces: "What output this step generates"
\`\`\`

The healing agent automatically: observes step events, triages failures (transient retry, runtime workaround, structural fix, plugin gap, or unresolvable), spawns specialist teams, and proposes workflow version updates for approval.`;
