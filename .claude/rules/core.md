---
paths:
  - src/core/**
  - tests/core/**
---

# Core Module

Classification types, policy engine, session management, storage abstraction,
logger, security primitives, secrets management, and image content types.

## Directory Structure

```
src/core/
├── types/      # Classification, session types, Result<T,E>
├── policy/     # Policy engine, hooks, rule evaluation
│   ├── hooks/    # Hook types, runner, violations, default rules
│   └── audit/    # Audit chain and HMAC primitives
├── session/    # Session manager, taint, lineage
├── storage/    # StorageProvider interface + implementations
├── logger/     # Structured logging with file rotation and log levels
├── security/   # Tool floors, path classification, filesystem security constants
├── secrets/    # Secrets management
│   ├── keychain/   # OS keychain, command runner, platform keychains
│   ├── encrypted/  # Encrypted file provider, crypto, I/O, types
│   └── backends/   # Secret store interface, memory store, file provider, key manager
└── image/      # Multimodal content block types
```

## Key Patterns

- `StorageProvider`: KV interface with `set/get/delete/list/close` — string keys, string values
- `SessionManager` wraps core session types + StorageProvider, keys prefixed `sessions:`
- Serialize/deserialize handles Date objects (toISOString/new Date)
- All session operations are immutable — return new objects
- `Result<T, E>` pattern for all fallible operations, never thrown exceptions

## Secrets (`src/core/secrets/`)

- `resolver.ts` — `resolveSecretRefs`, `resolveConfigSecrets`, `findSecretRefs` (root)
- `keychain/` — `keychain.ts` (SecretStore, createKeychain), `command_runner.ts`, `linux_keychain.ts`, `mac_keychain.ts`
- `encrypted/` — `encrypted_file_provider.ts`, `encrypted_file_crypto.ts`, `encrypted_file_io.ts`, `encrypted_file_types.ts`
- `backends/` — `secret_store.ts` (interface), `memory_store.ts`, `file_provider.ts`, `key_manager.ts`

## Policy (`src/core/policy/`)

- Root: `rules.ts`, `engine.ts`, `recipient.ts`
- `hooks/` — `hooks.ts`, `hook_types.ts`, `hook_runner.ts`, `hook_violations.ts`, `default_rules.ts`
- `audit/` — `audit.ts` (audit chain), `audit_hmac.ts` (HMAC primitives)

## Image Content Types

- `content.ts` — `MessageContent`, `ContentBlock`, `extractText`, `hasImages`, `imageBlock`
- These are core types shared by agent providers, orchestrator, compactor, and CLI
