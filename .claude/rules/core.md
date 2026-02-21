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
├── session/    # Session manager, taint, lineage
├── storage/    # StorageProvider interface + implementations
├── logger/     # Structured logging with file rotation and log levels
├── security/   # Tool floors, path classification, filesystem security constants
├── secrets/    # Secrets management — OS keychain, encrypted store, file-backed fallback
└── image/      # Multimodal content block types (TextContentBlock, ImageContentBlock, etc.)
```

## Key Patterns

- `StorageProvider`: KV interface with `set/get/delete/list/close` — string keys, string values
- `SessionManager` wraps core session types + StorageProvider, keys prefixed `sessions:`
- Serialize/deserialize handles Date objects (toISOString/new Date)
- All session operations are immutable — return new objects
- `Result<T, E>` pattern for all fallible operations, never thrown exceptions

## Secrets

- `keychain.ts` — `SecretStore` interface, `createKeychain`, `createMemorySecretStore`
- `resolver.ts` — `resolveSecretRefs`, `resolveConfigSecrets`, `findSecretRefs`
- `encrypted_file_provider.ts` — Encrypted storage backend
- `file_provider.ts` — Plain file-backed fallback
- `key_manager.ts` — Machine key derivation for encrypted store

## Image Content Types

- `content.ts` — `MessageContent`, `ContentBlock`, `extractText`, `hasImages`, `imageBlock`
- These are core types shared by agent providers, orchestrator, compactor, and CLI
