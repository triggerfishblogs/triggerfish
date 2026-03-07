# KB: Breaking Changes

A version-by-version list of changes that may require action when upgrading.

## Notion: `client_secret` Removed

**Commit:** 6d876c3

The `client_secret` field was removed from the Notion integration configuration as a security hardening measure. Notion now uses only the OAuth token stored in the OS keychain.

**Action required:** If your `triggerfish.yaml` has a `notion.client_secret` field, remove it. It will be ignored but may cause confusion.

**New setup flow:**

```bash
triggerfish connect notion
```

This stores the integration token in the keychain. No client secret is needed.

---

## Tool Names: Dots to Underscores

**Commit:** 505a443

All tool names were changed from dotted notation (`foo.bar`) to underscore notation (`foo_bar`). Some LLM providers do not support dots in tool names, which caused tool call failures.

**Action required:** If you have custom policy rules or skill definitions that reference tool names with dots, update them to use underscores:

```yaml
# Before
- tool: notion.search

# After
- tool: notion_search
```

---

## Windows Installer: Move-Item to Copy-Item

**Commit:** 5e0370f

The Windows PowerShell installer was changed from `Move-Item -Force` to `Copy-Item -Force` for binary replacement during upgrades. `Move-Item` does not reliably overwrite files on Windows.

**Action required:** None if you are installing fresh. If you are on an older version and `triggerfish update` fails on Windows, stop the service manually before updating:

```powershell
Stop-Service Triggerfish
# Then re-run the installer or triggerfish update
```

---

## Version Stamping: Runtime to Build-Time

**Commits:** e8b0c8c, eae3930, 6ce0c25

Version information was moved from runtime detection (checking `deno.json`) to build-time stamping from git tags. The CLI banner no longer shows a hardcoded version string.

**Action required:** None. `triggerfish version` continues to work. Development builds show `dev` as the version.

---

## Signal: JRE 21 to JRE 25

**Commit:** e5b1047

The Signal channel's auto-installer was updated to download JRE 25 (from Adoptium) instead of JRE 21. The signal-cli version was also pinned to v0.14.0.

**Action required:** If you have an existing signal-cli installation with an older JRE, re-run the Signal setup:

```bash
triggerfish config add-channel signal
```

This downloads the updated JRE and signal-cli.

---

## Secrets: Plaintext to Encrypted

The secrets storage format changed from plaintext JSON to AES-256-GCM encrypted JSON.

**Action required:** None. Migration is automatic. See [Secrets Migration](/support/kb/secrets-migration) for details.

After migration, rotating your secrets is recommended because the plaintext versions were previously stored on disk.

---

## Tidepool: Callback to Canvas Protocol

The Tidepool (A2UI) interface migrated from a callback-based `TidepoolTools` interface to a canvas-based protocol.

**Files affected:**
- `src/tools/tidepool/tools/tools_legacy.ts` (old interface, retained for compatibility)
- `src/tools/tidepool/tools/tools_canvas.ts` (new interface)

**Action required:** If you have custom skills that use the old Tidepool callback interface, they will continue to work through the legacy shim. New skills should use the canvas protocol.

---

## Config: Legacy `primary` String Format

The `models.primary` field previously accepted a plain string (`"anthropic/claude-sonnet-4-20250514"`). It now requires an object:

```yaml
# Legacy (still accepted for backward compatibility)
models:
  primary: "anthropic/claude-sonnet-4-20250514"

# Current (preferred)
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**Action required:** Update to the object format. The string format is still parsed but may be removed in a future version.

---

## Console Logging: Removed

**Commit:** 9ce1ce5

All raw `console.log`, `console.warn`, and `console.error` calls were migrated to the structured logger (`createLogger()`). Since Triggerfish runs as a daemon, stdout/stderr output is not visible to users. All logging now goes through the file writer.

**Action required:** None. If you were relying on console output for debugging (e.g., piping stdout), use `triggerfish logs` instead.

---

## Estimating Impact

When upgrading across multiple versions, check each entry above. Most changes are backward-compatible with automatic migration. The only changes that require manual action are:

1. **Notion client_secret removal** (remove the field from config)
2. **Tool name format change** (update custom policy rules)
3. **Signal JRE update** (re-run Signal setup if using Signal)

Everything else is handled automatically.
