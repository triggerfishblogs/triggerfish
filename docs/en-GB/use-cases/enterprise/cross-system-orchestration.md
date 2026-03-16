---
title: Cross-System Orchestration
description: How Triggerfish handles workflows that span 12+ systems with contextual judgment calls at every step, without the brittleness that kills traditional automation.
---

# Cross-System Orchestration with Judgment Calls

A typical procure-to-pay workflow touches a dozen systems. A purchase request starts in one platform, gets routed to an approval chain in another, triggers a vendor lookup in a third, creates a purchase order in a fourth, kicks off a receiving process in a fifth, matches invoices in a sixth, schedules payment in a seventh, and records everything in an eighth. Each system has its own API, its own update schedule, its own authentication model, and its own failure modes.

Traditional automation handles this with rigid pipelines. Step one calls API A, parses the response, passes a field to step two, which calls API B. It works until it doesn't. A vendor record has a slightly different format than expected. An approval comes back with a status code the pipeline wasn't designed for. A new required field appears in an API update. One broken step breaks the entire chain, and nobody knows until a downstream process fails days later.

The deeper problem isn't technical fragility. It's that real business processes require judgment. Should this invoice discrepancy be escalated or auto-resolved? Does this vendor's late delivery pattern warrant a contract review? Is this approval request urgent enough to skip the standard routing? These decisions currently live in people's heads, which means the automation can only handle the happy path.

## How Triggerfish Solves This

Triggerfish's workflow engine executes YAML-based workflow definitions that mix deterministic automation with AI reasoning in a single pipeline. Every step in the workflow passes through the same security enforcement layer that governs all Triggerfish operations, so classification tracking and audit trails hold across the entire chain regardless of how many systems are involved.

### Deterministic Steps for Deterministic Work

When a workflow step has a known input and a known output, it runs as a standard HTTP call, shell command, or MCP tool invocation. No LLM involvement, no latency penalty, no inference cost. The workflow engine supports `call: http` for REST APIs, `call: triggerfish:mcp` for any connected MCP server, and `run: shell` for command-line tools. These steps execute exactly like traditional automation, because for predictable work, traditional automation is the right approach.

### LLM Sub-Agents for Judgment Calls

When a workflow step requires contextual reasoning, the engine spawns a real LLM sub-agent session using `call: triggerfish:llm`. This isn't a single prompt/response. The sub-agent has access to every tool registered in Triggerfish, including web search, memory, browser automation, and all connected integrations. It can read documents, query databases, compare records, and make a decision based on everything it finds.

The sub-agent's output feeds directly into the next workflow step. If it accessed classified data during its reasoning, the session taint escalates automatically and propagates back to the parent workflow. The workflow engine tracks this, so a workflow that started at PUBLIC but hit CONFIDENTIAL data during a judgment call gets its entire execution history stored at the CONFIDENTIAL level. A lower-classified session cannot even see that the workflow ran.

### Conditional Branching Based on Real Context

The workflow DSL supports `switch` blocks for conditional routing, `for` loops for batch processing, and `set` operations for updating workflow state. Combined with LLM sub-agent steps that can evaluate complex conditions, this means the workflow can branch based on actual business context rather than just field values.

A procurement workflow can route differently based on the sub-agent's assessment of vendor risk. An onboarding workflow can skip steps that aren't relevant for a particular role. An incident response workflow can escalate to different teams based on the sub-agent's root cause analysis. The branching logic lives in the workflow definition, but the decision inputs come from AI reasoning.

### Self-Healing When Systems Change

When a deterministic step fails because an API changed its response format or a system returned an unexpected error, the workflow doesn't just stop. The engine can delegate the failed step to an LLM sub-agent that reads the error, inspects the response, and attempts an alternative approach. An API that added a new required field gets handled by the sub-agent reading the error message and adjusting the request. A system that changed its authentication flow gets navigated by the browser automation tools.

This doesn't mean every failure gets magically resolved. But it means the workflow degrades gracefully instead of failing silently. The sub-agent either finds a path forward or produces a clear explanation of what changed and why manual intervention is needed, instead of a cryptic error code buried in a log file that nobody checks.

### Security Across the Entire Chain

Every step in a Triggerfish workflow passes through the same policy enforcement hooks as any direct tool call. PRE_TOOL_CALL validates permissions and checks rate limits before execution. POST_TOOL_RESPONSE classifies the returned data and updates session taint. PRE_OUTPUT ensures nothing leaves the system at a classification level higher than the target allows.

This means a workflow that reads from your CRM (CONFIDENTIAL), processes the data through an LLM, and sends a summary to Slack doesn't accidentally leak confidential details into a public channel. The write-down prevention rule catches it at the PRE_OUTPUT hook, regardless of how many intermediate steps the data passed through. The classification travels with the data through the entire workflow.

The workflow definition itself can set a `classification_ceiling` that prevents the workflow from ever touching data above a specified level. A weekly summary workflow classified at INTERNAL cannot access CONFIDENTIAL data even if it has the credentials to do so. The ceiling is enforced in code, not by hoping the LLM respects a prompt instruction.

### Cron and Webhook Triggers

Workflows don't require someone to kick them off manually. The scheduler supports cron-based triggers for recurring workflows and webhook triggers for event-driven execution. A morning briefing workflow runs at 7am. A PR review workflow fires when GitHub sends a webhook. An invoice processing workflow triggers when a new file appears in a shared drive.

Webhook events carry their own classification level. A GitHub webhook for a private repository gets classified at CONFIDENTIAL automatically based on the domain classification mappings in the security config. The workflow inherits that classification and all downstream enforcement applies.

## What This Looks Like in Practice

A mid-market company running procure-to-pay across NetSuite, Coupa, DocuSign, and Slack defines a Triggerfish workflow that handles the full cycle. Deterministic steps handle the API calls to create purchase orders, route approvals, and match invoices. LLM sub-agent steps handle the exceptions: invoices with line items that don't match the PO, vendors who submitted documentation in an unexpected format, approval requests that need context about the requestor's history.

The workflow runs on a self-hosted Triggerfish instance. No data leaves the company's infrastructure. The classification system ensures that financial data from NetSuite stays at CONFIDENTIAL and cannot be sent to a Slack channel classified at INTERNAL. The audit trail captures every decision the LLM sub-agent made, every tool it called, and every piece of data it accessed, stored with full lineage tracking for compliance review.

When Coupa updates their API and changes a field name, the workflow's deterministic HTTP step fails. The engine delegates to a sub-agent that reads the error, identifies the changed field, and retries with the correct parameter. The workflow completes without human intervention, and the incident gets logged so an engineer can update the workflow definition to handle the new format going forward.
