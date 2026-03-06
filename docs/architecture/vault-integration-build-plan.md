# HashiCorp Vault Integration — Build Plan

> Build plan for implementing HashiCorp Vault as the first external secret
> management provider. Follows the interface design from the
> [external secret providers research](./external-secret-providers.md).

## Current Architecture Summary

The existing secrets system has:

- **`SecretStore` interface** (`src/core/secrets/backends/secret_store.ts`) —
  4 methods: `getSecret`, `setSecret`, `deleteSecret`, `listSecrets`, all
  returning `Result<T, E>`
- **Two-level resolution** — Config-time (`secret:key`) and tool-argument-time
  (`{{secret:key}}`) via `src/core/secrets/resolver.ts`
- **Multiple backends** — OS keychain, AES-256-GCM encrypted file, in-memory
- **Classification integration** — Secret access triggers taint escalation via
  the existing dispatch pipeline in `src/agent/dispatch/access_control.ts`
- **`SECRET_ACCESS` hook type** — Defined in `src/core/policy/rules.ts` but not
  yet actively enforced; reserved for this integration

---

## Phase 1: Foundation

**Goal**: Extend `SecretStore` with external provider capabilities and implement
a caching layer that all external providers share.

### 1.1 `ExternalSecretProvider` Interface

Extend `SecretStore` via a supertype that adds health checks, metadata, and
lease awareness. Existing backends remain unchanged — they implement
`SecretStore` only. Vault (and future cloud providers) implement
`ExternalSecretProvider`.

```typescript
// src/core/secrets/backends/external_provider.ts

interface SecretMetadata {
  readonly version: number;
  readonly createdAt: string;          // ISO 8601
  readonly expiresAt?: string;         // ISO 8601 (leased secrets)
  readonly classification?: ClassificationLevel;
  readonly customMetadata?: Readonly<Record<string, string>>;
}

interface ExternalSecretProvider extends SecretStore {
  /** Provider identifier (e.g., "vault", "aws-sm"). */
  readonly providerId: string;

  /** Check connectivity and authentication. */
  readonly checkHealth: () => Promise<Result<HealthStatus, string>>;

  /** Retrieve secret with metadata (version, lease, classification). */
  readonly getSecretWithMetadata: (
    name: string,
  ) => Promise<Result<{ value: string; metadata: SecretMetadata }, string>>;

  /** Renew a leased secret. No-op for static backends. */
  readonly renewLease: (name: string) => Promise<Result<true, string>>;

  /** Revoke a leased secret. */
  readonly revokeLease: (name: string) => Promise<Result<true, string>>;
}

interface HealthStatus {
  readonly healthy: boolean;
  readonly latencyMs: number;
  readonly message?: string;
}
```

Detection at resolution time uses a type guard:

```typescript
function isExternalProvider(store: SecretStore): store is ExternalSecretProvider {
  return "providerId" in store;
}
```

### 1.2 Caching Layer

An LRU cache wrapper that sits between the resolver and any
`ExternalSecretProvider`. Local backends (keychain, encrypted file) do not use
this cache — they are already local I/O.

```typescript
// src/core/secrets/cache/secret_cache.ts

interface SecretCacheOptions {
  readonly maxEntries: number;         // Default: 256
  readonly ttlMs: number;             // Default: 300_000 (5 min)
  readonly staleWhileRevalidateMs: number; // Default: 60_000 (1 min grace)
}
```

**Behavior**:

- **Cache hit (fresh)** — Return immediately
- **Cache hit (stale, within grace)** — Return stale value, trigger async
  background refresh
- **Cache miss** — Fetch from provider, populate cache, return
- **Provider unreachable, stale entry exists** — Return stale with warning log
- **Provider unreachable, no entry** — Return error (fail-closed)
- **Taint escalation** — No cache invalidation needed; classification filtering
  happens at the read layer, not the cache layer
- **Explicit invalidation** — `invalidate(name)` and `invalidateAll()` for
  rotation events

### 1.3 Composite Secret Store

A dispatcher that routes secret lookups to the correct backend based on a
configurable prefix map. This replaces the single `SecretStore` reference in
`OrchestratorConfig`.

```typescript
// src/core/secrets/composite_store.ts

interface CompositeSecretStoreOptions {
  /** Default backend for unprefixed secret names. */
  readonly defaultStore: SecretStore;
  /** Prefix-routed external providers: "vault:" -> VaultProvider. */
  readonly providers: ReadonlyMap<string, ExternalSecretProvider>;
}
```

**Resolution rules**:

- `secret:vault:database/creds/myapp` -> Routes to Vault provider, path
  `database/creds/myapp`
- `secret:provider:anthropic:apiKey` -> Routes to default store (existing
  behavior)
- `{{secret:vault:my-token}}` -> Routes to Vault in tool-argument resolution
- `{{secret:my-token}}` -> Routes to default store (backward compatible)

### 1.4 File Structure (Phase 1)

```
src/core/secrets/
  backends/
    secret_store.ts          # Existing (unchanged)
    external_provider.ts     # NEW — ExternalSecretProvider interface
    memory_store.ts          # Existing (unchanged)
    mod.ts                   # Updated — re-export new types
  cache/
    secret_cache.ts          # NEW — LRU cache with stale-while-revalidate
    secret_cache_test.ts     # NEW — Unit tests
    mod.ts                   # NEW — barrel
  composite_store.ts         # NEW — Multi-backend dispatcher
  composite_store_test.ts    # NEW — Unit tests
  mod.ts                     # Updated — re-export new types
```

### 1.5 Tests (Phase 1)

| Test File | Coverage |
|-----------|----------|
| `tests/core/secrets/external_provider_test.ts` | Type guard, interface contract |
| `tests/core/secrets/secret_cache_test.ts` | TTL expiry, stale-while-revalidate, invalidation, fail-closed |
| `tests/core/secrets/composite_store_test.ts` | Prefix routing, default fallback, missing provider error |

**Exit criteria**: All existing `tests/secrets/` tests pass unchanged. New tests
cover cache TTL, stale grace, invalidation, and composite routing.

---

## Phase 2: Vault Provider

**Goal**: Implement a HashiCorp Vault KV v2 secret engine provider with
AppRole and token authentication.

### 2.1 Vault Client

A minimal HTTP client for Vault's REST API. No external SDK dependency — Vault's
API is straightforward HTTP+JSON.

```typescript
// src/core/secrets/vault/vault_client.ts

interface VaultClientOptions {
  readonly address: string;            // e.g., "https://vault.example.com:8200"
  readonly namespace?: string;         // Vault Enterprise namespace
  readonly tlsCaCert?: string;         // Custom CA certificate path
  readonly requestTimeoutMs: number;   // Default: 10_000
}

interface VaultClient {
  readonly kvGet: (mount: string, path: string) => Promise<Result<KvResponse, string>>;
  readonly kvPut: (mount: string, path: string, data: Record<string, string>) => Promise<Result<KvMetadata, string>>;
  readonly kvDelete: (mount: string, path: string) => Promise<Result<true, string>>;
  readonly kvList: (mount: string, path: string) => Promise<Result<string[], string>>;
  readonly healthCheck: () => Promise<Result<VaultHealth, string>>;
  readonly tokenLookupSelf: () => Promise<Result<TokenInfo, string>>;
}
```

**KV v2 API endpoints**:

| Operation | Method | Path |
|-----------|--------|------|
| Read | GET | `/v1/{mount}/data/{path}` |
| Write | POST | `/v1/{mount}/data/{path}` |
| Delete | POST | `/v1/{mount}/delete/{path}` |
| List | LIST | `/v1/{mount}/metadata/{path}` |
| Health | GET | `/v1/sys/health` |

### 2.2 Authentication Methods

#### AppRole (recommended for production)

```typescript
// src/core/secrets/vault/auth/approle.ts

interface AppRoleAuthOptions {
  readonly roleId: string;             // From VAULT_ROLE_ID env var
  readonly secretId: string;           // From VAULT_SECRET_ID env var
  readonly mountPath?: string;         // Default: "approle"
}
```

**Token lifecycle**:
1. Authenticate with role_id + secret_id -> receive token + TTL
2. Store token in memory (never persisted to disk)
3. Schedule renewal at 75% of TTL
4. On renewal failure, re-authenticate with original credentials
5. On re-auth failure, log error and mark provider unhealthy

#### Token (for development / CI)

```typescript
// src/core/secrets/vault/auth/token.ts

interface TokenAuthOptions {
  readonly token: string;              // From VAULT_TOKEN env var
}
```

Simple static token. No renewal logic. Suitable for development or CI where
tokens are short-lived and injected.

#### Kubernetes (for K8s deployments)

```typescript
// src/core/secrets/vault/auth/kubernetes.ts

interface KubernetesAuthOptions {
  readonly role: string;               // Vault role bound to K8s service account
  readonly jwtPath?: string;           // Default: /var/run/secrets/kubernetes.io/serviceaccount/token
  readonly mountPath?: string;         // Default: "kubernetes"
}
```

Reads the service account JWT from the projected volume, exchanges it for a
Vault token. Token renewal follows the same 75% TTL pattern as AppRole.

### 2.3 Vault Secret Provider

Implements `ExternalSecretProvider` using the Vault client and auth layer.

```typescript
// src/core/secrets/vault/vault_provider.ts

interface VaultProviderOptions {
  readonly client: VaultClient;
  readonly auth: VaultAuth;            // Union of auth method interfaces
  readonly defaultMount: string;       // Default: "secret" (KV v2 mount)
  readonly pathPrefix?: string;        // Optional path prefix for all lookups
}
```

**Secret name mapping**:

Vault secrets are addressed as `{mount}/{path}#{key}`:

- `vault:secret/data/myapp#api_key` -> KV v2 mount `secret`, path `myapp`,
  key `api_key`
- `vault:database/creds/readonly` -> Dynamic secret engine mount `database`,
  path `creds/readonly`
- `vault:myapp-token` -> Default mount `secret`, path `myapp-token`, returns
  first key or `value` key

### 2.4 File Structure (Phase 2)

```
src/core/secrets/vault/
  vault_client.ts            # HTTP client for Vault REST API
  vault_provider.ts          # ExternalSecretProvider implementation
  vault_types.ts             # Vault-specific types (KvResponse, TokenInfo, etc.)
  auth/
    approle.ts               # AppRole authentication
    token.ts                 # Static token authentication
    kubernetes.ts            # Kubernetes service account auth
    mod.ts                   # Auth method union type and factory
  mod.ts                     # Barrel export
```

### 2.5 Tests (Phase 2)

| Test File | Coverage |
|-----------|----------|
| `tests/core/secrets/vault/vault_client_test.ts` | KV v2 CRUD, health check, error responses (mocked HTTP) |
| `tests/core/secrets/vault/approle_auth_test.ts` | Login, token renewal at 75% TTL, re-auth on failure |
| `tests/core/secrets/vault/kubernetes_auth_test.ts` | JWT read, login exchange, renewal |
| `tests/core/secrets/vault/vault_provider_test.ts` | Full SecretStore contract, metadata retrieval, lease renewal |
| `tests/core/secrets/vault/integration_test.ts` | End-to-end with Vault dev server (CI only, `--ignore` by default) |

**Mocking strategy**: All unit tests use a mock HTTP handler (no real Vault).
Integration tests use `vault server -dev` in CI with a known root token.

**Exit criteria**: Vault provider passes the full `SecretStore` contract test
suite (same tests that keychain and encrypted-file pass). Auth renewal works
under simulated token expiry.

---

## Phase 3: Classification-Aware Access

**Goal**: Map Vault paths to Triggerfish classification levels via config,
enforce access controls, and activate the `SECRET_ACCESS` hook.

### 3.1 Configuration Schema

Add a `secrets` top-level key to `triggerfish.yaml`:

```yaml
# triggerfish.yaml

secrets:
  # Default backend (existing behavior if omitted)
  default: keychain

  providers:
    vault:
      address: "https://vault.example.com:8200"
      namespace: "triggerfish"          # Optional, Vault Enterprise
      auth:
        method: approle                 # approle | token | kubernetes
        # Auth-specific fields resolved from env vars
        role_id: "${VAULT_ROLE_ID}"
        secret_id: "${VAULT_SECRET_ID}"
      default_mount: "secret"           # KV v2 mount point
      path_prefix: "triggerfish/"       # Prepended to all lookups
      tls:
        ca_cert: "/etc/vault/ca.pem"    # Optional custom CA
      cache:
        ttl: 300                        # Seconds, default 300
        max_entries: 256                # Default 256
        stale_grace: 60                 # Seconds, default 60
      startup: block                    # block | warn | skip

  # Classification mapping: Vault path prefixes -> classification levels
  classification:
    mappings:
      - path: "secret/data/triggerfish/restricted/*"
        level: RESTRICTED
      - path: "secret/data/triggerfish/confidential/*"
        level: CONFIDENTIAL
      - path: "secret/data/triggerfish/internal/*"
        level: INTERNAL
      - path: "secret/data/triggerfish/*"
        level: INTERNAL              # Default for unmapped paths
    default_level: INTERNAL            # Fallback if no path matches
```

### 3.2 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VAULT_ADDR` | Yes (if Vault enabled) | Vault server address. Overrides `secrets.providers.vault.address` |
| `VAULT_TOKEN` | For token auth | Static Vault token |
| `VAULT_ROLE_ID` | For AppRole auth | AppRole role ID |
| `VAULT_SECRET_ID` | For AppRole auth | AppRole secret ID (rotatable) |
| `VAULT_NAMESPACE` | No | Vault Enterprise namespace. Overrides config |
| `VAULT_CACERT` | No | Path to custom CA certificate |
| `VAULT_SKIP_VERIFY` | No | Skip TLS verification (dev only, logged at WARN) |
| `VAULT_K8S_ROLE` | For K8s auth | Kubernetes auth role name |

**Precedence**: Environment variables override YAML config values. This allows
the same config file across environments with per-environment secrets injected
via env.

### 3.3 Classification Enforcement

When a secret is accessed via Vault:

1. **Path matching** — Match the Vault path against `classification.mappings`
   (first match wins, glob patterns)
2. **Level assignment** — Assign the matched classification level (or
   `default_level` if no match)
3. **Taint check** — If `secret.classification > session.taint`, escalate taint
   via `escalateTaint(level, reason)`
4. **Access gate** — If the session's classification ceiling is below the
   secret's level, deny access (return error Result)
5. **Audit** — Log via `SECRET_ACCESS` hook with full context:
   `{ secretPath, classification, sessionId, decision, timestamp }`

### 3.4 `SECRET_ACCESS` Hook Activation

Activate the currently-reserved `SECRET_ACCESS` hook type:

```typescript
// Hook input for SECRET_ACCESS
interface SecretAccessHookInput {
  readonly secretName: string;
  readonly provider: string;           // "vault" | "keychain" | "encrypted-file"
  readonly classification: ClassificationLevel;
  readonly sessionId: SessionId;
  readonly sessionTaint: ClassificationLevel;
}

// Hook result
interface SecretAccessHookResult {
  readonly action: "ALLOW" | "DENY";
  readonly reason?: string;
  readonly escalateTo?: ClassificationLevel;
}
```

Policy rules can define custom logic:

```yaml
# Example policy rule
hooks:
  SECRET_ACCESS:
    - name: deny_restricted_in_background
      condition: "input.classification === 'RESTRICTED' && session.isBackground"
      action: DENY
      reason: "Background sessions cannot access RESTRICTED secrets"
```

### 3.5 File Structure (Phase 3)

```
src/core/secrets/
  classification/
    secret_classifier.ts     # Path-to-classification mapping logic
    secret_access_gate.ts    # Enforcement (taint check, ceiling check)
    mod.ts                   # Barrel
src/core/policy/
  hooks/
    secret_access_hook.ts    # SECRET_ACCESS hook handler (new file)
```

### 3.6 Tests (Phase 3)

| Test File | Coverage |
|-----------|----------|
| `tests/core/secrets/classification/classifier_test.ts` | Path glob matching, default level, ordering |
| `tests/core/secrets/classification/access_gate_test.ts` | Taint escalation, ceiling denial, allow path |
| `tests/core/policy/secret_access_hook_test.ts` | Hook evaluation, DENY on background + RESTRICTED |
| `tests/core/secrets/vault/classified_access_test.ts` | End-to-end: Vault fetch -> classify -> gate -> taint |

**Critical boundary tests** (analogous to Phase A2 memory classification tests):

1. PUBLIC session accesses INTERNAL secret -> taint escalates to INTERNAL
2. INTERNAL session accesses RESTRICTED secret -> DENIED (if ceiling is
   CONFIDENTIAL)
3. CONFIDENTIAL session accesses CONFIDENTIAL secret -> allowed, no escalation
4. Background session accesses RESTRICTED secret -> DENIED by hook
5. Secret with no classification mapping -> uses `default_level`

**Exit criteria**: All classification boundary tests pass. `SECRET_ACCESS` hook
fires on every Vault access. Existing keychain tests unchanged.

---

## Phase 4: Operational Tooling

**Goal**: Health monitoring, lease management, migration commands, and patrol
diagnostics.

### 4.1 Health Monitoring

Add Vault health to the existing `triggerfish patrol` diagnostic system:

```typescript
// src/core/secrets/vault/health.ts

interface VaultHealthReport {
  readonly connected: boolean;
  readonly initialized: boolean;
  readonly sealed: boolean;
  readonly latencyMs: number;
  readonly tokenTtlSeconds: number;
  readonly tokenRenewable: boolean;
  readonly cacheStats: {
    readonly entries: number;
    readonly hitRate: number;
    readonly staleServes: number;
  };
}
```

**Patrol checks**:

- `vault_reachable` — Can connect to Vault address
- `vault_unsealed` — Vault is initialized and unsealed
- `vault_auth_valid` — Current token is valid and not near expiry
- `vault_permissions` — Can read from configured mount paths
- `vault_cache_health` — Cache hit rate above threshold (warn if < 50%)

### 4.2 Lease Renewal

For dynamic secrets (database credentials, PKI certificates):

```typescript
// src/core/secrets/vault/lease_manager.ts

interface LeaseManagerOptions {
  readonly renewalThreshold: number;   // Renew at this fraction of TTL (default: 0.75)
  readonly maxRetries: number;         // Default: 3
  readonly onRenewalFailure: "warn" | "revoke-and-refetch";
}
```

**Lifecycle**:

1. Dynamic secret fetched -> lease ID and TTL returned
2. `LeaseManager` schedules renewal at 75% of TTL
3. On successful renewal -> update TTL, reschedule
4. On renewal failure -> retry up to `maxRetries`
5. On exhausted retries -> revoke old lease, fetch new secret, update cache
6. All lease events logged at INFO level with `{ leaseId, path, ttl, action }`

### 4.3 Migration Commands

Extend `triggerfish config` with Vault migration:

```
triggerfish secrets migrate --from keychain --to vault [--path-prefix triggerfish/]
triggerfish secrets migrate --from vault --to keychain  # Rollback
triggerfish secrets verify --provider vault              # Verify all refs resolve
triggerfish secrets list --provider vault                # List with metadata
```

**Migration flow** (`keychain -> vault`):

1. List all secrets in keychain
2. For each secret:
   a. Read value from keychain
   b. Write to Vault at `{path_prefix}/{secret_name}`
   c. Verify round-trip (read back from Vault)
   d. Log migration result
3. Update `triggerfish.yaml` to set `secrets.default: vault`
4. Run `triggerfish secrets verify` to confirm all `secret:` refs resolve
5. Optionally delete from keychain with `--delete-source` flag (off by default)

**Rollback**: Reverse the migration direction. Since keychain secrets are not
deleted by default, rollback is simply changing `secrets.default` back to
`keychain`.

### 4.4 File Structure (Phase 4)

```
src/core/secrets/vault/
  health.ts                  # Health report generation
  lease_manager.ts           # Dynamic secret lease renewal
  lease_manager_test.ts      # Unit tests
src/cli/commands/
  secrets_migrate.ts         # Migration command handler
  secrets_verify.ts          # Verification command handler
src/dive/
  patrol_vault.ts            # Patrol diagnostic checks for Vault
```

### 4.5 Tests (Phase 4)

| Test File | Coverage |
|-----------|----------|
| `tests/core/secrets/vault/health_test.ts` | Health report generation, sealed/unsealed states |
| `tests/core/secrets/vault/lease_manager_test.ts` | Renewal scheduling, retry, revoke-and-refetch |
| `tests/cli/secrets_migrate_test.ts` | Keychain->Vault migration, round-trip verify, rollback |
| `tests/dive/patrol_vault_test.ts` | Patrol checks pass/fail/warn states |

**Exit criteria**: Migration round-trips successfully. Lease renewal handles
simulated TTL expiry. Patrol reports accurate health status.

---

## Complete File Structure

```
src/core/secrets/
  backends/
    secret_store.ts              # Existing (unchanged)
    external_provider.ts         # Phase 1 — ExternalSecretProvider interface
    memory_store.ts              # Existing (unchanged)
    mod.ts                       # Updated
  cache/
    secret_cache.ts              # Phase 1 — LRU cache
    mod.ts                       # Phase 1
  classification/
    secret_classifier.ts         # Phase 3 — Path-to-level mapping
    secret_access_gate.ts        # Phase 3 — Access enforcement
    mod.ts                       # Phase 3
  vault/
    vault_client.ts              # Phase 2 — HTTP client
    vault_provider.ts            # Phase 2 — ExternalSecretProvider impl
    vault_types.ts               # Phase 2 — Response types
    health.ts                    # Phase 4 — Health reporting
    lease_manager.ts             # Phase 4 — Lease renewal
    auth/
      approle.ts                 # Phase 2 — AppRole auth
      token.ts                   # Phase 2 — Token auth
      kubernetes.ts              # Phase 2 — K8s auth
      mod.ts                     # Phase 2
    mod.ts                       # Phase 2
  composite_store.ts             # Phase 1 — Multi-backend dispatcher
  resolver.ts                    # Existing (minor update for prefix routing)
  mod.ts                         # Updated each phase

src/core/policy/hooks/
  secret_access_hook.ts          # Phase 3 — SECRET_ACCESS handler

src/cli/commands/
  secrets_migrate.ts             # Phase 4 — Migration command
  secrets_verify.ts              # Phase 4 — Verification command

src/dive/
  patrol_vault.ts                # Phase 4 — Patrol diagnostics
```

## Dependency Analysis

### Layer Compliance

All new code lives in `src/core/secrets/` (Layer 0) or `src/cli/` / `src/dive/`
(Layer 2). No layer violations:

- `core/secrets/vault/` imports only from `core/` (types, policy, logger)
- `cli/commands/secrets_*.ts` imports from `core/` (allowed for Layer 2)
- `dive/patrol_vault.ts` imports from `core/` (allowed for Layer 2)

### External Dependencies

**None required.** Vault's REST API is plain HTTP+JSON. The implementation uses
Deno's built-in `fetch()` for HTTP calls, avoiding any external SDK dependency.
This keeps the dependency tree clean and avoids version conflicts.

### SSRF Considerations

Vault's address is operator-configured (not user-supplied). However, the Vault
client must still:

1. Resolve DNS before connecting (consistent with existing SSRF policy)
2. Reject private/reserved IP ranges **unless** the address is explicitly
   allowlisted in config as an `internal_service`
3. Log all outbound connections at DEBUG level

Add a `secrets.providers.vault.allow_private_network: true` config flag for
on-premise Vault deployments on private networks (common in enterprise). Default
is `false`.

---

## Configuration Reference

### Minimal Configuration (Development)

```yaml
secrets:
  providers:
    vault:
      address: "http://127.0.0.1:8200"
      auth:
        method: token
      allow_private_network: true
```

With `VAULT_TOKEN` set in environment.

### Production Configuration (AppRole)

```yaml
secrets:
  default: vault
  providers:
    vault:
      address: "https://vault.prod.example.com:8200"
      namespace: "triggerfish"
      auth:
        method: approle
        role_id: "${VAULT_ROLE_ID}"
        secret_id: "${VAULT_SECRET_ID}"
      default_mount: "secret"
      path_prefix: "triggerfish/"
      tls:
        ca_cert: "/etc/vault/ca.pem"
      cache:
        ttl: 300
        max_entries: 512
      startup: block
  classification:
    mappings:
      - path: "secret/data/triggerfish/restricted/*"
        level: RESTRICTED
      - path: "secret/data/triggerfish/confidential/*"
        level: CONFIDENTIAL
      - path: "secret/data/triggerfish/*"
        level: INTERNAL
    default_level: INTERNAL
```

### Kubernetes Configuration

```yaml
secrets:
  default: vault
  providers:
    vault:
      address: "https://vault.vault.svc.cluster.local:8200"
      auth:
        method: kubernetes
        role: "triggerfish"
      allow_private_network: true
      startup: block
```

---

## Implementation Roadmap

```
Phase 1: Foundation                          ~3-4 days
  |-- ExternalSecretProvider interface
  |-- Secret cache (LRU + stale-while-revalidate)
  |-- Composite store (prefix routing)
  |-- Tests
  v
Phase 2: Vault Provider                     ~4-5 days
  |-- Vault HTTP client (KV v2)
  |-- Auth methods (AppRole, Token, K8s)
  |-- Token renewal lifecycle
  |-- VaultProvider implementing ExternalSecretProvider
  |-- Tests (mocked + dev server integration)
  v
Phase 3: Classification-Aware Access        ~3-4 days
  |-- Path-to-classification mapping
  |-- Access gate (taint escalation, ceiling check)
  |-- SECRET_ACCESS hook activation
  |-- Config schema for classification mappings
  |-- Boundary tests
  v
Phase 4: Operational Tooling                ~3-4 days
  |-- Health monitoring + patrol integration
  |-- Lease manager for dynamic secrets
  |-- Migration commands (keychain <-> vault)
  |-- Verification commands
  |-- Patrol diagnostic checks

Total estimate: ~13-17 days
```

Phases are sequential — each builds on the previous. Within Phase 2, auth
methods can be implemented in parallel (AppRole, Token, K8s are independent).

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Vault unavailable at startup | Configurable: `startup: block\|warn\|skip` |
| Token expires mid-operation | 75% TTL renewal + automatic re-auth |
| Cache serves stale secret after rotation | Stale-while-revalidate with configurable TTL; rotation webhook support planned |
| Classification mapping misconfigured | Default-deny: unmapped paths get `default_level`, never PUBLIC |
| Migration data loss | Source not deleted by default; round-trip verification required |
| SSRF via Vault address | DNS resolution + private IP check (unless `allow_private_network: true`) |
| Breaking existing deployments | Vault is opt-in; `secrets.default: keychain` remains the default |

---

## Backward Compatibility

- **No breaking changes.** Existing `SecretStore` interface is unchanged. All
  current backends (keychain, encrypted-file, memory) continue to work
- **Opt-in.** Vault support activates only when `secrets.providers.vault` is
  present in config
- **Incremental migration.** Secrets can be migrated one at a time; both
  backends can coexist during transition via the composite store
- **Config defaults.** If `secrets` key is absent from config, behavior is
  identical to current implementation
