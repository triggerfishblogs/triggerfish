# External Secret Management Providers

This document is the research output for
[Issue #210](https://github.com/greghavens/triggerfish/issues/210): evaluating
external secret management providers and designing an integration architecture
for Triggerfish.

## Table of Contents

- [Current Architecture](#current-architecture)
- [Provider Comparison Matrix](#provider-comparison-matrix)
- [Interface Design](#interface-design)
- [Security Architecture Review](#security-architecture-review)
- [Caching and Failover Strategy](#caching-and-failover-strategy)
- [Implementation Roadmap](#implementation-roadmap)
- [Migration Path](#migration-path)

---

## Current Architecture

Triggerfish stores secrets through the `SecretStore` interface
(`src/core/secrets/backends/secret_store.ts`):

```typescript
interface SecretStore {
  readonly getSecret: (name: string) => Promise<Result<string, string>>;
  readonly setSecret: (name: string, value: string) => Promise<Result<true, string>>;
  readonly deleteSecret: (name: string) => Promise<Result<true, string>>;
  readonly listSecrets: () => Promise<Result<string[], string>>;
}
```

### Existing Backends

| Backend | Platform | Storage | Encryption |
|---------|----------|---------|------------|
| macOS Keychain | macOS | `security` CLI | OS-managed |
| Linux libsecret | Linux | D-Bus Secret Service | OS-managed |
| Encrypted file | Docker, Windows | JSON file + key file | AES-256-GCM, machine-bound key |
| In-memory | Tests | `Map<string, string>` | None |

### Secret Resolution Flow

Secrets enter the runtime through two paths:

1. **Config-level** (`secret:key`) — resolved at startup by walking
   `triggerfish.yaml`. Missing secrets fail startup immediately.
2. **Tool-argument-level** (`{{secret:name}}`) — resolved at the tool executor
   boundary before dispatch. The LLM never sees resolved values.

Both paths call `SecretStore.getSecret()` and operate below the LLM layer.

### Classification Interaction

Secrets currently exist **outside** the classification hierarchy:

- `secret_list` is classified PUBLIC (read-only, names only).
- `secret_save` and `secret_delete` are intentionally unclassified (gated by
  non-owner tool ceiling instead).
- Secret values never enter LLM context or logs.
- No taint escalation occurs from secret access itself.

This is a design decision: the OS keychain has no concept of classification, so
forcing classification on it would create false guarantees. External providers
change this calculus (see [Security Architecture Review](#security-architecture-review)).

---

## Provider Comparison Matrix

### Tier 1 — Enterprise Priority

| Criteria | HashiCorp Vault | AWS Secrets Manager | Azure Key Vault | GCP Secret Manager |
|----------|----------------|--------------------|-----------------|--------------------|
| **Auth Methods** | Token, AppRole, K8s, LDAP, OIDC | IAM role, access key, IRSA | Managed identity, service principal, cert | Service account, workload identity |
| **Secret Types** | KV v1/v2, dynamic (DB, AWS, PKI), transit | Static key-value, binary | Keys, secrets, certificates | Static key-value, binary |
| **Dynamic Secrets** | Yes (DB creds, cloud creds, PKI) | No (rotation only) | No (rotation only) | No |
| **Rotation** | Built-in for dynamic; manual/plugin for KV | Native with Lambda rotation functions | Native with auto-rotation | Native with Cloud Functions |
| **Versioning** | KV v2: full version history | Automatic staging labels | 1 version per secret (soft-delete) | Up to 32,000 versions per secret |
| **HSM Support** | Enterprise (Vault Enterprise Seal) | AWS CloudHSM backing | Managed HSM tier (FIPS 140-2 L3) | Cloud HSM backing |
| **Audit Logging** | Built-in audit device (file, syslog, socket) | CloudTrail | Azure Monitor / Diagnostic logs | Cloud Audit Logs |
| **Access Control** | ACL policies (path-based) | IAM policies + resource policies | RBAC + access policies | IAM policies |
| **Latency** | 1-5ms (local), 10-50ms (network) | 50-200ms | 50-200ms | 50-200ms |
| **SDK/API** | HTTP API, official Go/Ruby/Python/Node SDKs | AWS SDK (all languages) | Azure SDK (all languages) | Google Cloud SDK (all languages) |
| **Deno Compatibility** | HTTP API (no official Deno SDK) | `fetch` + AWS Sig v4 signing | `fetch` + Azure AD token | `fetch` + Google auth |
| **Self-Hosted** | Yes (primary deployment model) | No (AWS-only) | No (Azure-only) | No (GCP-only) |
| **Multi-Cloud** | Yes | No | No | No |
| **Cost Model** | Open source core; Enterprise license | $0.40/secret/month + $0.05/10K calls | $0.03/operation + HSM hourly | $0.06/10K operations |
| **Classification Mapping** | Path-based (`secret/data/restricted/*`) | Tags + IAM conditions | Tags + RBAC | Labels + IAM conditions |

### Tier 2 — Future Consideration

| Criteria | 1Password Connect | Doppler | CyberArk Conjur |
|----------|-------------------|---------|-----------------|
| **Auth** | Connect token | Service token | API key, OIDC, K8s |
| **Dynamic Secrets** | No | No | Yes (limited) |
| **Self-Hosted** | Connect server required | No | Yes |
| **Best For** | Developer teams already on 1Password | Small teams, good DX | Large enterprise, mainframe integration |

### Selection Criteria Scoring

Criteria are weighted by relevance to Triggerfish's architecture:

| Criterion (Weight) | Vault | AWS SM | Azure KV | GCP SM |
|--------------------|-------|--------|----------|--------|
| Deno HTTP API compatibility (20%) | 5 | 4 | 4 | 4 |
| Classification mapping fit (20%) | 5 | 3 | 3 | 3 |
| Self-hosted / multi-cloud (15%) | 5 | 1 | 1 | 1 |
| Dynamic secret support (15%) | 5 | 2 | 2 | 2 |
| Audit log correlation (10%) | 5 | 4 | 4 | 4 |
| Operational simplicity (10%) | 3 | 5 | 5 | 5 |
| HSM / compliance (10%) | 4 | 5 | 5 | 5 |
| **Weighted Total** | **4.70** | **3.20** | **3.20** | **3.20** |

**Recommendation**: Vault first (broadest fit, self-hosted, multi-cloud,
classification-aware paths). Cloud provider managers second, sharing a common
cloud-secrets adapter pattern.

---

## Interface Design

### Decision: Extend SecretStore, Do Not Replace

The existing `SecretStore` interface is minimal and well-integrated. External
providers should implement `SecretStore` directly, matching the pattern used by
all existing backends (keychain, encrypted file, memory).

**Rationale:**
- Both resolution paths (`secret:` config refs and `{{secret:name}}` tool args)
  call `SecretStore.getSecret()`. No changes needed to resolution code.
- The factory function `createKeychain()` already selects backends based on
  environment. Adding a `"vault"` or `"aws"` branch is natural.
- Creating a parallel abstraction would force all consumers to handle two
  interfaces.

### Extended Interface for Provider Capabilities

External providers have capabilities that local backends do not. Rather than
bloating `SecretStore`, use an extended interface that external providers
optionally implement:

```typescript
/**
 * Extended capabilities for external secret providers.
 *
 * Providers implementing this interface support features beyond basic
 * get/set/delete: health checks, metadata, leasing, and rotation.
 * The base SecretStore interface remains unchanged for compatibility.
 */
interface ExternalSecretProvider extends SecretStore {
  /** Provider type identifier (e.g., "vault", "aws-secrets-manager"). */
  readonly providerType: string;

  /**
   * Check provider connectivity and authentication.
   * Called at startup and periodically for health monitoring.
   */
  readonly checkHealth: () => Promise<Result<ProviderHealth, string>>;

  /**
   * Retrieve a secret with metadata (version, expiry, classification hint).
   * Falls back to getSecret() semantics if metadata is unavailable.
   */
  readonly getSecretWithMetadata: (
    name: string,
  ) => Promise<Result<SecretWithMetadata, string>>;

  /**
   * Renew a dynamic secret's lease.
   * Returns error if the provider does not support leasing.
   */
  readonly renewLease: (
    leaseId: string,
  ) => Promise<Result<LeaseInfo, string>>;

  /**
   * Revoke a dynamic secret's lease immediately.
   */
  readonly revokeLease: (
    leaseId: string,
  ) => Promise<Result<true, string>>;

  /**
   * Release provider resources (connections, background renewals).
   */
  readonly close: () => Promise<void>;
}

interface ProviderHealth {
  readonly status: "healthy" | "degraded" | "unreachable";
  readonly latencyMs: number;
  readonly message?: string;
}

interface SecretWithMetadata {
  readonly value: string;
  readonly version?: string;
  readonly expiresAt?: Date;
  readonly classification?: ClassificationLevel;
  readonly leaseId?: string;
  readonly leaseDuration?: number;
}

interface LeaseInfo {
  readonly leaseId: string;
  readonly expiresAt: Date;
  readonly renewable: boolean;
}
```

### Type Detection at Runtime

Consumer code can detect extended capabilities:

```typescript
function isExternalProvider(
  store: SecretStore,
): store is ExternalSecretProvider {
  return "providerType" in store && "checkHealth" in store;
}
```

### Factory Integration

The existing `createKeychain()` factory gains a new branch:

```typescript
function createSecretBackend(config: SecretBackendConfig): SecretStore {
  switch (config.backend) {
    case "vault":
      return createVaultSecretProvider(config.vault);
    case "aws-secrets-manager":
      return createAwsSecretsProvider(config.aws);
    case "azure-key-vault":
      return createAzureKeyVaultProvider(config.azure);
    case "gcp-secret-manager":
      return createGcpSecretProvider(config.gcp);
    case "keychain":
    default:
      return createKeychain();
  }
}
```

### Configuration Schema

```yaml
secrets:
  backend: "vault"          # "keychain" (default), "vault", "aws-secrets-manager",
                             # "azure-key-vault", "gcp-secret-manager"

  # HashiCorp Vault
  vault:
    address: "https://vault.internal:8200"
    auth:
      method: "approle"      # "token", "approle", "kubernetes"
      roleId: "secret:vault-role-id"     # Can itself be a secret ref
      secretId: "secret:vault-secret-id"
    secretEngine: "kv"       # "kv" (v1/v2), "database", "transit"
    basePath: "triggerfish/"
    namespace: "production"  # Vault Enterprise namespace
    tls:
      caCert: "/etc/vault/ca.pem"
      skipVerify: false

  # AWS Secrets Manager
  aws:
    region: "us-east-1"
    auth:
      method: "iam-role"     # "iam-role", "access-key", "profile"
      accessKeyId: "secret:aws-access-key"
      secretAccessKey: "secret:aws-secret-key"
    prefix: "triggerfish/"

  # Azure Key Vault
  azure:
    vaultUrl: "https://triggerfish.vault.azure.net"
    auth:
      method: "managed-identity"  # "managed-identity", "service-principal"
      tenantId: "..."
      clientId: "..."

  # GCP Secret Manager
  gcp:
    project: "my-project-id"
    auth:
      method: "service-account"   # "service-account", "workload-identity"
      keyFile: "/etc/gcp/sa.json"

  # Classification mapping for external secrets
  classification:
    default: "CONFIDENTIAL"
    paths:
      - pattern: "restricted/*"
        level: "RESTRICTED"
      - pattern: "internal/*"
        level: "INTERNAL"
      - pattern: "public/*"
        level: "PUBLIC"

  # Caching configuration
  cache:
    enabled: true
    ttlSeconds: 300            # 5 minutes
    maxEntries: 1000
    clearOnTaintEscalation: true
```

### Trade-Off Analysis

| Decision | Option A | Option B | Chosen | Rationale |
|----------|----------|----------|--------|-----------|
| Interface | New `ExternalSecretProvider` parallel to `SecretStore` | Extend `SecretStore` with optional methods | **Extend via subtype** | Preserves backward compatibility; consumers don't need changes |
| Config location | Separate `secrets.yaml` | Section in `triggerfish.yaml` | **`triggerfish.yaml` section** | Single config file, consistent with channels/models/tools |
| Auth bootstrapping | Require env vars | Allow `secret:` refs in vault config | **Both** | Bootstrap credentials via env var or existing keychain; vault config can reference keychain-stored credentials |
| Multi-provider | One active provider | Multiple providers simultaneously | **One primary + optional keychain fallback** | Simplifies resolution; keychain still available for bootstrap credentials |
| Lease management | Provider manages internally | Expose lease API to orchestrator | **Internal with advisory events** | Orchestrator doesn't need lease details; provider emits log events on renewal/expiry |

---

## Security Architecture Review

### Trust Boundary Analysis

```
┌─────────────────────────────────────────────────────┐
│ Triggerfish Process                                  │
│                                                     │
│  ┌─────────────┐    ┌──────────────────────┐       │
│  │ LLM Context │    │ Tool Executor        │       │
│  │ (untrusted) │    │ (trusted boundary)   │       │
│  │             │    │                      │       │
│  │ Sees only:  │    │ resolveSecretRefs()  │       │
│  │ {{secret:}} │───►│ calls store.get()    │       │
│  │ tokens      │    │                      │       │
│  └─────────────┘    └──────────┬───────────┘       │
│                                │                    │
│                     ┌──────────▼───────────┐       │
│                     │ SecretStore impl     │       │
│                     │ (cache layer)        │       │
│                     └──────────┬───────────┘       │
│                                │                    │
└────────────────────────────────┼────────────────────┘
                                 │ HTTPS (mTLS)
                    ┌────────────▼────────────┐
                    │ External Provider       │
                    │ (Vault / AWS SM / etc.) │
                    │                         │
                    │ Own trust domain:       │
                    │ - Own audit logs        │
                    │ - Own access policies   │
                    │ - Own encryption keys   │
                    └─────────────────────────┘
```

### Threat Model

| Threat | Mitigation |
|--------|------------|
| **Provider credentials compromised** | AppRole/IAM role auth with short-lived tokens; no long-lived credentials stored on disk. Bootstrap credentials in OS keychain. |
| **Network interception (MITM)** | TLS required for all provider connections. Vault: mTLS with pinned CA. Cloud: SDK-managed TLS. |
| **Provider unavailable (DoS/outage)** | Cached values served during transient outages. Startup can block or degrade gracefully (configurable). Health check loop detects and logs. |
| **Secret value in memory** | Values held in process memory only during resolution. Cache entries cleared on taint escalation. No swap-to-disk protection (OS responsibility). |
| **Audit gap between systems** | Triggerfish logs secret access with correlation IDs. Provider logs the same access from its side. Correlation via request timestamp + secret path. |
| **Over-broad provider policy** | Vault policies scoped to `triggerfish/*` path prefix. AWS/Azure/GCP policies scoped to resource tags. Provider should not have access beyond Triggerfish's secrets. |
| **SSRF via provider address** | Provider addresses are configured at startup (not runtime). Config validation rejects private IPs for cloud providers. Self-hosted Vault addresses bypass SSRF checks (intentional — same trust domain as the process). |
| **LLM prompt injection to exfiltrate secrets** | Unchanged: secrets are resolved at the executor boundary, never in LLM context. PRE_OUTPUT hook blocks any attempt to leak values. |
| **Dynamic secret leak via response** | POST_TOOL_RESPONSE hook inspects responses. Dynamic credentials (DB creds) must be used within the tool, never returned to LLM. |

### Classification Mapping for External Providers

External providers introduce a mapping opportunity that the OS keychain lacks.
Vault's path-based organization maps naturally to Triggerfish classifications:

```
secret/data/triggerfish/
  restricted/     → RESTRICTED
    db-password
    encryption-key
  confidential/   → CONFIDENTIAL
    api-keys/
    oauth-tokens/
  internal/       → INTERNAL
    feature-flags/
    service-urls/
  public/         → PUBLIC
    public-api-keys/
```

For cloud providers (AWS, Azure, GCP), classification maps to tags/labels:

```json
{
  "Tags": [
    { "Key": "triggerfish:classification", "Value": "CONFIDENTIAL" },
    { "Key": "triggerfish:owner", "Value": "agent-001" }
  ]
}
```

### Classification-Aware Access Control

With external providers, secret access should escalate session taint:

1. `getSecretWithMetadata()` returns the secret's classification.
2. The tool executor (or a new SECRET_ACCESS hook rule) escalates taint to
   `max(session.taint, secret.classification)`.
3. Write-down checks apply: a PUBLIC-tainted session reading a CONFIDENTIAL
   secret escalates to CONFIDENTIAL, preventing the value from flowing to
   PUBLIC channels.

This is a behavioral change from the current system (where secrets don't
escalate taint). It should be **opt-in** via the `classification` config
section. When no classification mapping is configured, secrets behave as today
(no taint escalation).

### SSRF Considerations

External providers require outbound HTTPS connections. The current SSRF
prevention (DNS resolution + IP denylist) applies to `web_fetch` and
`browser.navigate`, not to provider connections. Provider connections are:

- Configured at startup, not at runtime
- Addressed to known, admin-configured endpoints
- Authenticated with credentials the LLM cannot influence

**Recommendation**: Provider connections bypass the SSRF denylist. The
`address`/`vaultUrl`/`region` fields are config-level (not LLM-controlled),
so SSRF risk does not apply. Log the bypass decision at startup for
auditability.

---

## Caching and Failover Strategy

### Cache Architecture

```
┌──────────────────────────────────────────────────┐
│ CachingSecretStore (decorator)                   │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ LRU Cache (in-memory)                      │  │
│  │                                            │  │
│  │ Key: secret name                           │  │
│  │ Value: { value, metadata, cachedAt, ttl }  │  │
│  │ Max entries: configurable (default 1000)   │  │
│  │ TTL: configurable (default 5 min)          │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  Cache miss → delegate to inner SecretStore      │
│  Cache hit + fresh → return cached               │
│  Cache hit + stale → return cached, refresh bg   │
│  Taint escalation → clear classified entries     │
│                                                  │
│  Inner: ExternalSecretProvider                   │
└──────────────────────────────────────────────────┘
```

### Cache Invalidation Rules

| Event | Action |
|-------|--------|
| TTL expires | Stale-while-revalidate: serve stale, refresh in background |
| `setSecret()` called | Evict that key from cache |
| `deleteSecret()` called | Evict that key from cache |
| Session taint escalation | Optionally clear entries below new taint level |
| Provider health → unreachable | Extend cache TTL (serve stale during outage) |
| Provider health → healthy | Resume normal TTL |
| Explicit `cache.clear()` | Clear all entries |

### Cache Security Constraints

- Cache entries are in-memory only (no disk persistence).
- Cache never stores values at a classification above what the session has
  accessed (defense in depth — the provider itself gates access).
- Cache entries include classification metadata so taint-escalation clearing
  can selectively evict.

### Failover Strategy

**Decision**: Fail-open to cache, fail-closed on empty cache.

```
Provider healthy    → fetch from provider, update cache
Provider degraded   → fetch with timeout, fallback to cache
Provider unreachable + cache hit  → serve stale (log warning)
Provider unreachable + cache miss → return error (fail-closed)
```

**No automatic fallback to local keychain.** Mixing providers creates a
confusing source-of-truth problem. If the operator configures Vault, secrets
come from Vault. If Vault is down and the cache is empty, the operation fails
with a clear error. The operator can configure a local fallback explicitly via
multi-provider config if desired.

### Startup Behavior

| Configuration | Behavior |
|---------------|----------|
| `startupCheck: "block"` (default) | Block startup until provider is reachable. Retry 3 times with exponential backoff (1s, 2s, 4s). Fail startup on timeout. |
| `startupCheck: "warn"` | Log warning if provider is unreachable, continue startup. First secret access will fail if provider is still down. |
| `startupCheck: "skip"` | No startup health check. Useful for development with stub providers. |

---

## Implementation Roadmap

### Phase 1: Foundation (Estimated: 1 issue)

**Goal**: Establish the provider abstraction and caching layer without any
external provider implementation.

- Define `ExternalSecretProvider` interface in
  `src/core/secrets/backends/external_provider.ts`.
- Define `SecretWithMetadata`, `ProviderHealth`, `LeaseInfo` types.
- Implement `CachingSecretStore` decorator in
  `src/core/secrets/cache/caching_store.ts`.
- Implement `createSecretBackend()` factory with config parsing.
- Add `secrets:` config section to `triggerfish.yaml` schema validation.
- Add `isExternalProvider()` type guard.
- Unit tests for cache behavior (TTL, eviction, taint-escalation clearing).
- Unit tests for factory routing logic.

**Files created/modified:**
```
src/core/secrets/
  backends/
    external_provider.ts      (new — interface + types)
  cache/
    caching_store.ts          (new — cache decorator)
    mod.ts                    (new — barrel)
  factory.ts                  (new — createSecretBackend)
  mod.ts                      (modified — re-export new types)

tests/core/secrets/
  cache_test.ts               (new)
  factory_test.ts             (new)
```

### Phase 2: Vault Provider (Estimated: 1 issue)

**Goal**: First external provider — HashiCorp Vault KV v2.

- Implement `createVaultSecretProvider()` using Vault HTTP API.
- Support auth methods: Token, AppRole, Kubernetes.
- Map Vault paths to classification levels.
- Implement lease renewal for dynamic secrets.
- Implement health check (`GET /v1/sys/health`).
- Integration tests with Vault dev server (`vault server -dev`).

**Files created:**
```
src/core/secrets/
  providers/
    vault/
      vault_provider.ts       (new — main provider)
      vault_auth.ts           (new — auth method implementations)
      vault_types.ts          (new — Vault-specific types)
      mod.ts                  (new — barrel)

tests/core/secrets/
  vault_provider_test.ts      (new — unit tests with mocked HTTP)
  vault_integration_test.ts   (new — integration test with dev server)
```

### Phase 3: Cloud Provider Adapters (Estimated: 1 issue per provider)

**Goal**: AWS, Azure, and GCP adapters sharing a common pattern.

Each cloud provider follows the same structure:

- HTTP-based implementation using `fetch` + provider-specific auth signing.
- Tag/label-based classification mapping.
- Native rotation detection.
- Health check via provider status endpoint.
- Unit tests with mocked HTTP responses.

**Files created (per provider):**
```
src/core/secrets/
  providers/
    aws/
      aws_provider.ts
      aws_auth.ts
      aws_types.ts
      mod.ts
    azure/
      azure_provider.ts
      azure_auth.ts
      azure_types.ts
      mod.ts
    gcp/
      gcp_provider.ts
      gcp_auth.ts
      gcp_types.ts
      mod.ts
```

### Phase 4: Classification-Aware Secret Access (Estimated: 1 issue)

**Goal**: Opt-in taint escalation when accessing classified secrets.

- Add SECRET_ACCESS hook rule that escalates taint based on secret metadata.
- Wire `getSecretWithMetadata()` into tool-argument resolution path.
- Add classification config validation.
- Update audit logging to include secret classification in log context.
- End-to-end tests for taint escalation via secret access.

### Phase 5: Operational Tooling (Estimated: 1 issue)

**Goal**: Runtime diagnostics and operational support.

- `triggerfish patrol` check for secret provider health.
- `triggerfish dive` setup flow for external provider configuration.
- Secret provider status in Gateway WebSocket status endpoint.
- Metrics: cache hit rate, provider latency, lease renewal count.

### Dependency Graph

```
Phase 1 (Foundation)
    │
    ├──► Phase 2 (Vault)
    │        │
    │        └──► Phase 4 (Classification-Aware Access)
    │                  │
    │                  └──► Phase 5 (Operational Tooling)
    │
    └──► Phase 3a (AWS)
    └──► Phase 3b (Azure)
    └──► Phase 3c (GCP)
```

Phases 2 and 3 can proceed in parallel after Phase 1. Phase 4 depends on at
least one provider being implemented. Phase 5 depends on Phase 4.

---

## Migration Path

### From Encrypted File Store to External Provider

Migration is designed to be **incremental** — the operator can migrate secrets
one at a time, with rollback at every step.

### Step 1: Configure External Provider (Parallel Mode)

```yaml
secrets:
  backend: "vault"
  vault:
    address: "https://vault.internal:8200"
    auth:
      method: "approle"
      roleId: "secret:vault-role-id"
      secretId: "secret:vault-secret-id"
    basePath: "triggerfish/"
```

At this point:
- Vault is the primary backend.
- The OS keychain is still available for bootstrap credentials (the Vault
  `roleId` and `secretId` above are keychain-stored).
- Existing `secret:` refs in config resolve from Vault.

### Step 2: Populate Vault

A migration utility reads secrets from the existing backend and writes them to
Vault:

```bash
triggerfish secrets migrate --from keychain --to vault
```

This command:
1. Lists all secrets in the source backend.
2. For each secret, reads the value and writes it to Vault at the configured
   `basePath`.
3. Optionally assigns classification based on name patterns (configurable).
4. Logs each migrated secret (name only, never value).
5. Does **not** delete source secrets (operator does that manually after
   verification).

### Step 3: Verify

```bash
triggerfish patrol --check secrets
```

This check:
- Verifies all `secret:` refs in config resolve from the new backend.
- Compares secret names in source and target (not values — that would
  require reading both, which is acceptable during migration only).
- Reports any secrets present in source but missing in target.

### Step 4: Decommission Old Backend

After verification, the operator:
1. Removes the old keychain entries (or encrypted file).
2. Updates bootstrap credentials to use environment variables or Kubernetes
   secrets instead of keychain refs.

### Rollback

At any point, the operator can revert to keychain by changing `backend` back
to `"keychain"` in config. No data is lost because Step 2 does not delete
source secrets.

---

## Open Questions Resolved

### 1. Interface Design

**Answer**: Extend `SecretStore` via a subtype (`ExternalSecretProvider`).
Existing consumers remain unchanged. New capabilities (health, metadata,
leasing) are opt-in via type detection.

### 2. Caching Strategy

**Answer**: In-memory LRU cache with configurable TTL (default 5 minutes).
Stale-while-revalidate pattern. Optional clearing on taint escalation.
No disk persistence for cached secret values.

### 3. Failover

**Answer**: Fail-open to cache, fail-closed on empty cache. No automatic
fallback between providers (confusing source-of-truth). Operators can
configure explicit fallback via `startupCheck: "warn"`.

### 4. Startup Dependency

**Answer**: Configurable — default is block (retry 3x with backoff), with
`"warn"` and `"skip"` options for development and gradual rollout.

### 5. Classification Mapping

**Answer**: Vault paths map directly to levels. Cloud providers use
tags/labels. Mapping is configured in `secrets.classification.paths`.
Taint escalation on secret access is opt-in (Phase 4).

### 6. Audit Trail Correlation

**Answer**: Triggerfish logs secret access with `{ operation, secretName,
sessionId, timestamp }`. Provider logs the same access from its side.
Correlation by timestamp + secret path. No shared correlation ID needed
(clock skew is acceptable for audit purposes).

### 7. Credential Bootstrapping

**Answer**: External provider credentials can be:
- Environment variables (container orchestrator injects them)
- OS keychain entries (for hybrid local+vault deployments)
- Kubernetes service account (auto-mounted, no manual config)

### 8. Multi-Provider

**Answer**: One primary provider at a time. Keychain remains available as the
bootstrap credential store (provider credentials stored there). A future
enhancement could support routing different secret prefixes to different
providers.

---

## Related Documentation

- [Secrets Management](../security/secrets.md) — current secrets architecture
- [Storage](./storage.md) — `StorageProvider` pattern reference
- [Classification](./classification.md) — classification levels and taint
- [Taint and Sessions](./taint-and-sessions.md) — taint propagation mechanics
- [Policy Engine](./policy-engine.md) — hook enforcement points

---

*Research conducted for [Issue #210](https://github.com/greghavens/triggerfish/issues/210).
Generated with [Claude Code](https://claude.ai/code).*
