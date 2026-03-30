# Security Invariants & Architecture Principles

## Architecture Principles

1. **Deterministic enforcement** — Policy hooks use pure functions, no LLM calls, no randomness. Same input always produces same decision.
2. **Taint propagation** — All data carries classification metadata. Session taint can only escalate, never decrease.
3. **No write-down** — Data cannot flow to a lower classification level. CONFIDENTIAL data cannot reach a PUBLIC channel.
4. **Audit everything** — All policy decisions logged with full context: timestamp, hook type, session ID, input, result, rules evaluated.
5. **Hooks are unforgeable** — The LLM cannot bypass, modify, or influence policy hook decisions. Hooks run in code below the LLM layer.
6. **Session isolation** — Each session tracks taint independently. Background sessions spawn with fresh PUBLIC taint. Agent workspaces are fully isolated.
7. **SSRF prevention** — All outbound HTTP (web_fetch, browser.navigate) resolves DNS first and checks against a hardcoded IP denylist. Private/reserved ranges always blocked. Not configurable.
8. **Memory classification gating** — Cross-session memory writes are forced to session taint level. Reads filtered by `canFlowTo`. The LLM cannot choose what classification a memory is stored at.
9. **Default deny** — Integrations, plugins, and channels must have a classification level configured or they are rejected. Built-in tools are ungated. External data sources are never silently allowed without classification.
10. **Resource classification gates execution** — Every tool call targets a resource. Every resource has a classification. PRE_TOOL_CALL hooks gate execution based on the resource's classification vs session taint. Resource classification always takes precedence over tool or integration-level classification. This applies to ALL tools — native integration tools, `run_command`, `web_fetch`, filesystem tools, everything. When `run_command` executes a command that targets a resource (a GitHub repo, a URL, a file path), the resource's classification is what matters, not the command's text or the tool's default. Classification priority: resource-specific (repo cache, path classifier) > domain classifier (URLs) > integration prefix fallback > filesystem default.

## What NOT to Do

- Never use `any` types
- Never throw exceptions for expected failures (use Result)
- Never mutate session state (always return new objects)
- Never make LLM calls inside policy hooks
- Never allow the LLM to influence hook decisions
- Never store secrets in config files (use OS keychain or env vars)
- Never expose the Gateway WebSocket to the public internet without auth
- Never use raw `Map` or in-memory structures for data that must survive restarts — use StorageProvider
- Never implement ad-hoc "notify owner" logic — use NotificationService
- Never hardcode a single LLM provider — use LlmProvider interface
- Never duplicate domain security config — `src/tools/web/domains.ts` is the single source of truth for SSRF, allowlist, denylist, and classification mappings. Browser imports from there.
- Never let the LLM choose memory classification — always force to `session.taint` in PRE_TOOL_CALL
- Never allow memory reads above session taint — filter by `canFlowTo` in every query
- Never skip DNS resolution before outbound HTTP — SSRF prevention requires checking resolved IP, not just hostname
- Never default to ALLOW — if a tool, integration, or path has no classification or permission configured, the default must always be DENY. Silently allowing unclassified operations is a security violation
- Never classify a tool call without identifying the resource it targets — every tool call has a target resource (repo, URL, file path). Classify the RESOURCE, not the tool or the command text
- Never hardcode domain lists for resource classification — use the domain classifier (`DomainClassifier`), which is the single source of truth for URL-based classification across all tools (`web_fetch`, `browser_*`, `run_command`)
- Never treat API path segments in shell commands as filesystem paths — `repos/owner/name/releases` in `gh api` is a GitHub API route, not a filesystem access. `run_command` must identify the resource (repo, URL) before falling back to filesystem path extraction
- Never hardcode plugin or integration names in core code — integrations are loaded by config. Core code uses generic dispatch (prefix maps, executor chains), not per-integration if-blocks
- Never put session management (taint escalation, classification enforcement) inside plugins — enforcement belongs in the centralized orchestrator tool executor wrapper, not in individual tool handlers
- Never put shared logic in interface-specific directories — `src/cli/` is for CLI only, `src/channels/telegram/` is for Telegram only, etc. Notification delivery, session management, scheduling, and any cross-cutting logic belongs in `src/gateway/` or the appropriate core module. Interface directories contain only adapter/UI code and wiring.
