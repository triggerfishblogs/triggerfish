---
title: AI Inference in Production Workflows
description: How Triggerfish bridges the gap between AI demos and durable production workflows with security enforcement, audit trails, and workflow orchestration.
---

# AI/ML Inference Integration into Production Workflows

Most enterprise AI projects die in the gap between demo and production. A team builds a proof of concept that uses GPT-4 to classify support tickets or summarize legal documents or generate marketing copy. The demo works. Leadership gets excited. Then the project stalls for months trying to answer questions the demo never had to: Where does the data come from? Where does the output go? Who approves the AI's decisions? What happens when the model hallucinates? How do we audit what it did? How do we prevent it from accessing data it shouldn't see? How do we stop it from sending sensitive information to the wrong place?

These aren't hypothetical concerns. 95% of enterprise generative AI pilots fail to deliver financial returns, and the reason isn't that the technology doesn't work. The models are capable. The failure is in the plumbing: getting AI inference reliably integrated into the actual business workflows where it needs to operate, with the security controls, error handling, and audit trails that production systems require.

The typical enterprise response is to build a custom integration layer. An engineering team spends months connecting the AI model to the data sources, building the pipeline, adding authentication, implementing logging, creating an approval workflow, and bolting on security checks. By the time the integration is "production ready," the original model has been superseded by a newer one, the business requirements have shifted, and the team needs to start over.

## How Triggerfish Solves This

Triggerfish eliminates the integration gap by making AI inference a first-class step in the workflow engine, governed by the same security enforcement, audit logging, and classification controls that apply to every other operation in the system. An LLM sub-agent step in a Triggerfish workflow is not a bolt-on. It's a native operation with the same policy hooks, lineage tracking, and write-down prevention as an HTTP call or a database query.

### AI as a Workflow Step, Not a Separate System

In the workflow DSL, an LLM inference step is defined with `call: triggerfish:llm`. The task description tells the sub-agent what to do in natural language. The sub-agent has access to every tool registered in Triggerfish. It can search the web, query databases through MCP tools, read documents, browse websites, and use cross-session memory. When the step completes, its output feeds directly into the next step of the workflow.

This means there is no separate "AI system" to integrate. The inference happens inside the workflow, using the same credentials, the same data connections, and the same security enforcement as everything else. An engineering team doesn't need to build a custom integration layer because the integration layer already exists.

### Security That Doesn't Require Custom Engineering

The most time-consuming part of productionizing an AI workflow isn't the AI. It's the security and compliance work. Which data can the model see? Where can it send its output? How do we prevent it from leaking sensitive information? How do we log everything for audit?

In Triggerfish, these questions are answered by the platform architecture, not by per-project engineering. The classification system tracks data sensitivity at every boundary. Session taint escalates when the model accesses classified data. Write-down prevention blocks output from flowing to a channel classified below the session's taint level. Every tool call, every data access, and every output decision is logged with full lineage.

An AI workflow that reads customer records (CONFIDENTIAL) and generates a summary cannot send that summary to a public Slack channel. This isn't enforced by a prompt instruction that the model might ignore. It's enforced by deterministic code in the PRE_OUTPUT hook that the model cannot see, cannot modify, and cannot bypass. The policy hooks run below the LLM layer. The LLM requests an action, and the policy layer decides whether to allow it. Timeout equals rejection. There is no path from the model to the outside world that doesn't pass through enforcement.

### Audit Trails That Already Exist

Every AI decision in a Triggerfish workflow generates lineage records automatically. The lineage tracks what data the model accessed, what classification level it carried, what transformations were applied, and where the output was sent. This isn't a logging feature that needs to be enabled or configured. It's a structural property of the platform. Every data element carries provenance metadata from creation through every transformation to its final destination.

For regulated industries, this means the compliance evidence for an AI workflow exists from day one. An auditor can trace any AI-generated output back through the complete chain: which model produced it, what data it was based on, what tools the model used during reasoning, what classification level applied at each step, and whether any policy enforcement actions occurred. This evidence collection happens automatically because it's built into the enforcement hooks, not bolted on as a reporting layer.

### Model Flexibility Without Re-Architecture

Triggerfish supports multiple LLM providers through the LlmProvider interface: Anthropic, OpenAI, Google, local models via Ollama, and OpenRouter for any routed model. Provider selection is per-agent configurable with automatic failover. When a better model becomes available or a provider changes pricing, switching happens at the configuration level without touching the workflow definitions.

This directly addresses the "project is obsolete before it ships" problem. The workflow definitions describe what the AI should do, not which model does it. Switching from GPT-4 to Claude to a fine-tuned local model changes one configuration value. The workflow, the security controls, the audit trails, and the integration points all remain exactly the same.

### Cron, Webhooks, and Event-Driven Execution

AI workflows that run on schedule or in response to events don't need a human to prompt them. The scheduler supports five-field cron expressions for recurring workflows and webhook endpoints for event-driven triggers. A daily report generation workflow runs at 6am. A document classification workflow fires when a new file arrives via webhook. A sentiment analysis workflow triggers on every new support ticket.

Each scheduled or event-triggered execution spawns an isolated session with fresh taint. The workflow runs in its own security context, independent of any interactive sessions. If the cron-triggered workflow accesses CONFIDENTIAL data, only that execution's history gets classified at CONFIDENTIAL. Other scheduled workflows running at PUBLIC classification are unaffected.

### Error Handling and Human-in-the-Loop

Production AI workflows need to handle failure gracefully. The workflow DSL supports `raise` for explicit error conditions and try/catch semantics through error handling in task definitions. When an LLM sub-agent produces low-confidence output or encounters a situation it can't handle, the workflow can route to a human approval queue, send a notification through the notification service, or take a fallback action.

The notification service delivers alerts across all connected channels with priority and deduplication. If a workflow needs human approval before an AI-generated contract amendment gets sent, the approval request can arrive on Slack, WhatsApp, email, or wherever the approver is. The workflow pauses until the approval comes through, then continues from where it left off.

## What This Looks Like in Practice

A legal department wants to automate contract review. The traditional approach: six months of custom development to build a pipeline that extracts clauses from uploaded contracts, classifies risk levels, flags non-standard terms, and generates a summary for the reviewing attorney. The project requires a dedicated engineering team, a custom security review, a compliance sign-off, and ongoing maintenance.

With Triggerfish, the workflow definition takes a day to write. Upload triggers a webhook. An LLM sub-agent reads the contract, extracts key clauses, classifies risk levels, and identifies non-standard terms. A validation step checks the extraction against the firm's clause library stored in memory. The summary gets routed to the assigned attorney's notification channel. The entire pipeline runs at RESTRICTED classification because contracts contain client privileged information, and write-down prevention ensures no contract data leaks to a channel below RESTRICTED.

When the firm switches LLM providers (because a new model handles legal language better, or because the current provider raises prices), the change is a single line in the configuration. The workflow definition, the security controls, the audit trail, and the notification routing all continue working without modification. When the firm adds a new clause type to their risk framework, the LLM sub-agent picks it up without rewriting extraction rules because it reads for meaning, not patterns.

The compliance team gets a complete audit trail from day one. Every contract processed, every clause extracted, every risk classification assigned, every notification sent, and every attorney approval recorded, with full lineage back to the source document. The evidence collection that would have taken weeks of custom reporting work exists automatically as a structural property of the platform.
