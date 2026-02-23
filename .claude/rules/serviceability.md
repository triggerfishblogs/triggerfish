# Serviceability

Every `catch`/`.catch()` must log, rethrow, or return a typed Result. No silent swallowing.

Every `log.error()` includes structured context: `{ operation, err }` plus relevant IDs.

No `console.log/warn/error` — use `createLogger()`.

Security calls (`escalateTaint`, `classify`, `canFlowTo`, `hookRunner.run`, `verifyHmac`, `authenticate`, `authorize`) must have a log statement within ±5 lines.

Log `err` (full object), not `err.message`.

Channel adapters (`src/channels/`) must log: connect, receive, deliver, errors.

Security events (denied, blocked, violation, taint change) at WARN+, never DEBUG/TRACE.

Log messages must identify the specific operation — never `"failed"`, `"error occurred"`, `"something went wrong"`, `"done"`, `"success"` alone.

All branches in security/routing/provider/dispatch logic must log with decision inputs.
