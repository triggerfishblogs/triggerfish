# How to File a Good Issue

A well-structured issue gets resolved faster. A vague issue with no logs and no reproduction steps often sits for weeks because no one can act on it. Here is what to include.

## Before Filing

1. **Search existing issues.** Someone may have already reported the same problem. Check [open issues](https://github.com/greghavens/triggerfish/issues) and [closed issues](https://github.com/greghavens/triggerfish/issues?q=is%3Aissue+is%3Aclosed).

2. **Check the troubleshooting guides.** The [Troubleshooting section](/support/troubleshooting/) covers most common problems.

3. **Check known issues.** The [Known Issues](/support/kb/known-issues) page lists problems we are already aware of.

4. **Try the latest version.** If you are not on the latest release, update first:
   ```bash
   triggerfish update
   ```

## What to Include

### 1. Environment

```
Triggerfish version: (run `triggerfish version`)
OS: (e.g., macOS 15.2, Ubuntu 24.04, Windows 11, Docker)
Architecture: (x64 or arm64)
Installation method: (binary installer, from source, Docker)
```

### 2. Steps to Reproduce

Write the exact sequence of actions that leads to the problem. Be specific:

**Bad:**
> The bot stopped working.

**Good:**
> 1. Started Triggerfish with Telegram channel configured
> 2. Sent the message "check my calendar for tomorrow" in a DM to the bot
> 3. The bot responded with the calendar results
> 4. Sent "now email those results to alice@example.com"
> 5. Expected: bot sends the email
> 6. Actual: bot responds with "Write-down blocked: CONFIDENTIAL cannot flow to INTERNAL"

### 3. Expected vs. Actual Behavior

Say what you expected to happen and what actually happened. Include the exact error message if there is one. Copy-paste is better than paraphrasing.

### 4. Log Output

Attach a [log bundle](/support/guides/collecting-logs):

```bash
triggerfish logs bundle
```

If the issue is security-sensitive, you can redact portions, but note in the issue what you redacted.

At minimum, paste the relevant log lines. Include timestamps so we can correlate events.

### 5. Configuration (Redacted)

Paste the relevant section of your `triggerfish.yaml`. **Always redact secrets.** Replace actual values with placeholders:

```yaml
# Good - secrets redacted
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"  # stored in keychain
channels:
  telegram:
    ownerId: "REDACTED"
    classification: INTERNAL
```

### 6. Patrol Output

```bash
triggerfish patrol
```

Paste the output. This gives us a quick snapshot of system health.

## Issue Types

### Bug Report

Use this template for things that are broken:

```markdown
## Bug Report

**Environment:**
- Version:
- OS:
- Install method:

**Steps to reproduce:**
1.
2.
3.

**Expected behavior:**

**Actual behavior:**

**Error message (if any):**

**Patrol output:**

**Relevant config (redacted):**

**Log bundle:** (attach file)
```

### Feature Request

```markdown
## Feature Request

**Problem:** What are you trying to do that you cannot do today?

**Proposed solution:** How do you think it should work?

**Alternatives considered:** What else did you try?
```

### Question / Support Request

If you are not sure whether something is a bug or you are just stuck, use [GitHub Discussions](https://github.com/greghavens/triggerfish/discussions) instead of Issues. Discussions are better for questions that might not have a single right answer.

## What NOT to Include

- **Raw API keys or passwords.** Always redact.
- **Personal data from conversations.** Redact names, emails, phone numbers.
- **Entire log files inline.** Attach the log bundle as a file instead of pasting thousands of lines.

## After Filing

- **Watch for follow-up questions.** Maintainers may need more information.
- **Test fixes.** If a fix is pushed, you may be asked to verify it.
- **Close the issue** if you find the solution yourself. Post the solution so others can benefit.
