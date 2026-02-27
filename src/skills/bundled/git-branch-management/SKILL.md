---
name: git-branch-management
version: 1.0.0
description: >
  Git branch management for development work. Teaches the agent to create
  feature branches, commit atomically, open PRs via gh CLI, track PR state,
  and respond to code reviews. Supports two review delivery modes:
  webhook events (instant) or trigger-based polling via gh CLI (works
  behind firewalls). Use when the agent performs development tasks in
  the exec environment.
classification_ceiling: INTERNAL
requires_tools:
  - exec
network_domains:
  - github.com
  - api.github.com
---

# Git Branch Management

Manage git branches, commits, PRs, and code review feedback when doing development work in the exec environment. All git and GitHub CLI operations use `exec.run`.

## When to Use

- Any development task that modifies code in a git repository
- Bug fixes, feature work, refactoring, dependency updates
- When a webhook delivers a `pull_request_review`, `pull_request_review_comment`, `issue_comment`, or `pull_request.closed` event for a tracked PR
- During trigger wakeups: scan tracked PRs for new reviews via `gh pr view`

## Branch Workflow

**Never work on main.** Always create a feature branch before making changes.

### 1. Check current state

```
exec.run("git status")
exec.run("git branch --show-current")
```

If you are on `main` or `master`, create a new branch. If you are already on a feature branch for the current task, continue on it.

### 2. Create a feature branch

Branch naming convention:

```
triggerfish/<agent-id>/<short-description>
```

Examples:
- `triggerfish/agent-1/fix-auth-timeout`
- `triggerfish/agent-1/add-retry-logic`
- `triggerfish/agent-1/update-deps`

```
exec.run("git checkout -b triggerfish/<agent-id>/<short-description>")
```

Always branch from an up-to-date main:

```
exec.run("git fetch origin")
exec.run("git checkout main && git pull origin main")
exec.run("git checkout -b triggerfish/<agent-id>/<short-description>")
```

### 3. Keep the description short

Use 2-4 words separated by hyphens. Lowercase. No special characters. The branch name should describe the intent, not the implementation.

## Atomic Commits

Commit after each logical unit of work. Do not accumulate all changes into one giant commit at the end.

### What counts as a logical unit

- Add a new function and its tests
- Fix a specific bug
- Update a configuration file
- Refactor a module
- Add or update documentation

### Commit message format

```
<type>: <short description>

<optional body explaining why, not what>
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

Examples:
```
feat: add retry logic to webhook handler
fix: prevent nil pointer in session lookup
test: add coverage for edge case in taint propagation
refactor: extract common validation into shared helper
docs: update API reference for new endpoint
```

### How to commit

```
exec.run("git add <specific-files>")
exec.run('git commit -m "feat: add retry logic to webhook handler"')
```

Prefer adding specific files over `git add .` to avoid committing unintended changes. Never commit secrets, credentials, `.env` files, or large binaries.

## Running Tests

Before opening a PR, run the project's test suite:

```
exec.run("deno task test")
```

If tests fail, fix the failures and commit the fix as a separate commit. Do not amend the previous commit -- keep the history clean and traceable.

## Opening a Pull Request

When work is complete and tests pass, push the branch and open a PR.

### Push the branch

```
exec.run("git push -u origin triggerfish/<agent-id>/<short-description>")
```

### Create the PR

Use `gh pr create` with a structured description:

```
exec.run('gh pr create --title "<concise title>" --body "## What Changed\n\n- <bullet points>\n\n## How It Was Tested\n\n- <test details>\n\n## Limitations\n\n- <any known limitations or follow-up work>"')
```

The PR description must include:

| Section | Content |
|---------|---------|
| **What Changed** | Bullet points describing the changes |
| **How It Was Tested** | What tests were run, what was verified |
| **Limitations** | Known limitations, edge cases, follow-up work needed |

### Capture the PR details

After `gh pr create`, parse the output to extract the PR number and URL. The `gh` CLI prints the PR URL on success.

```
exec.run("gh pr view --json number,url")
```

## PR Tracking

After opening a PR, write a tracking file so future sessions can recover context -- whether triggered by a webhook event or a scheduled polling check.

### Tracking file location

```
~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/<branch-name>.json
```

Replace `/` in the branch name with `--` for the filename:
- Branch: `triggerfish/agent-1/fix-auth-timeout`
- File: `triggerfish--agent-1--fix-auth-timeout.json`

### Tracking file schema

```json
{
  "branch": "triggerfish/agent-1/fix-auth-timeout",
  "prNumber": 42,
  "prUrl": "https://github.com/owner/repo/pull/42",
  "task": "Fix authentication timeout when token expires during long requests",
  "repository": "owner/repo",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z",
  "lastCheckedAt": "2025-01-15T10:30:00Z",
  "lastReviewId": "",
  "status": "open",
  "commits": [
    "feat: add token refresh before expiry",
    "test: add timeout edge case coverage"
  ]
}
```

### Create the tracking file

```
exec.run("mkdir -p ~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking")
exec.run('echo \'<json>\' > ~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/<branch-name>.json')
```

Or use `exec.write` if available.

### Status values

| Status | Meaning |
|--------|---------|
| `open` | PR is open, waiting for review |
| `changes_requested` | Reviewer requested changes |
| `approved` | Review approved, awaiting merge decision |
| `merged` | PR was merged |
| `closed` | PR was closed without merging |

## After Opening the PR

**Stop.** Do not spin-loop or sleep-poll waiting for feedback.

Review feedback is delivered via one of two mechanisms:

- **Webhooks (instant):** If the owner has configured GitHub webhooks pointing to the Triggerfish gateway, review events arrive immediately as new sessions. This requires the gateway to be reachable from the internet.
- **Trigger-based polling (works behind firewalls):** A cron job periodically checks all open tracked PRs for new activity via `gh pr view`. No inbound connectivity required -- the agent reaches out to GitHub.

Both paths use the same tracking files and the same handling process below.

## Checking for Reviews (Trigger-Based Polling)

During a trigger wakeup or cron job, scan all open tracking files:

### 1. List open tracking files

```
exec.run("ls ~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/")
```

Skip files in the `completed/` subdirectory. For each `.json` file, read it and check `status`. Only process PRs with status `open` or `changes_requested`.

### 2. Query GitHub for new activity

```
exec.run("gh pr view <pr-number> --json state,reviews,comments,mergedAt,closedAt")
```

Compare review data against `lastCheckedAt` and `lastReviewId` in the tracking file. If there are new reviews or comments, the PR needs attention -- proceed to "Handling Review Feedback" below.

### 3. Detect state changes

| GitHub state | Action |
|-------------|--------|
| New review with `CHANGES_REQUESTED` | Address the feedback (see below) |
| New review with `APPROVED` | Update status to `approved`, notify owner (see "Merge Policy") |
| New comments since `lastCheckedAt` | Read and address if actionable |
| PR state is `MERGED` | Run cleanup (see "Cleanup After Merge") |
| PR state is `CLOSED` (not merged) | Archive tracking file, notify owner |
| No new activity | Update `lastCheckedAt`, move on |

### 4. Update the tracking file

After checking, always update `lastCheckedAt` to the current timestamp. If reviews were found, update `lastReviewId` to the most recent review ID.

## Handling Review Feedback (Webhook Path)

When a webhook delivers a review event (`pull_request_review`, `pull_request_review_comment`, or `issue_comment`), follow this process:

### 1. Identify the PR

Extract the PR number from the webhook payload. The payload includes `pull_request.number` or `issue.number`.

### 2. Find the tracking file

```
exec.run("ls ~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/")
```

Read each tracking file and match by `prNumber`. If no tracking file is found, this PR was not created by this agent -- skip it or notify the owner.

### 3. Check out the branch

```
exec.run("git fetch origin")
exec.run("git checkout <branch-name>")
exec.run("git pull origin <branch-name>")
```

### 4. Read the review

```
exec.run("gh pr view <pr-number> --json reviews,comments")
exec.run("gh pr diff <pr-number>")
```

For inline review comments:

```
exec.run("gh api repos/<owner>/<repo>/pulls/<pr-number>/comments")
```

### 5. Make requested changes

Address each review comment. Commit each logical fix separately with a clear message referencing the feedback:

```
exec.run('git commit -m "fix: address review - handle nil case in parser"')
```

### 6. Push the changes

```
exec.run("git push origin <branch-name>")
```

### 7. Respond on the PR

If the review warrants a response:

```
exec.run('gh pr comment <pr-number> --body "Addressed the review feedback:\n- Fixed nil case in parser\n- Added test for empty input\n\nReady for re-review."')
```

### 8. Update the tracking file

Update `status` to `changes_requested` or back to `open` after addressing feedback. Update `updatedAt`, `lastCheckedAt`, and append to `commits`.

### 9. Repeat

Continue until the review is approved. Each review event (webhook) or trigger check (polling) spawns a new session -- the tracking file provides continuity.

## Merge Policy

**Default: Do NOT auto-merge.** When a review is approved:

1. Update the tracking file status to `approved`
2. Notify the owner via the notification system:
   ```
   "PR #42 (fix-auth-timeout) has been approved and is ready to merge."
   ```
3. Wait for the owner to merge manually or for an explicit merge instruction

### Auto-merge (opt-in)

If `github.auto_merge` is set to `true` in `triggerfish.yaml`:

```
exec.run("gh pr merge <pr-number> --squash --delete-branch")
```

Then proceed to cleanup.

## Cleanup After Merge

When a `pull_request.closed` event arrives with `merged: true`, or when `gh pr view` reports the PR as merged, or after an explicit merge:

### 1. Delete the remote branch (if not already deleted)

```
exec.run("git push origin --delete <branch-name>")
```

The `--delete-branch` flag on `gh pr merge` handles this automatically. If the branch still exists, delete it manually.

### 2. Clean up local

```
exec.run("git checkout main")
exec.run("git pull origin main")
exec.run("git branch -d <branch-name>")
```

### 3. Archive the tracking file

```
exec.run("mkdir -p ~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/completed")
exec.run("mv ~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/<file>.json ~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/completed/<file>.json")
```

Update the tracking file's `status` to `merged` before archiving.

### 4. Closed without merge

If the PR was closed without merging (`merged: false` in the event payload), update tracking status to `closed`, archive the file, and notify the owner.

## Webhook Configuration

The owner configures one or both delivery mechanisms in `triggerfish.yaml`.

### Option A: Trigger-Based Polling (works behind firewalls)

No inbound connectivity needed. The agent reaches out to GitHub on a schedule.

```yaml
scheduler:
  cron:
    jobs:
      - id: pr-review-check
        schedule: "*/15 * * * *"
        task: >
          Check all open PR tracking files in scratch/pr-tracking/.
          For each open PR, query GitHub for new reviews or state changes
          using gh pr view. Address any review feedback, handle merges
          and closures.
        classification: INTERNAL
```

Or add "check open PRs for review feedback" to the agent's TRIGGER.md for execution during the regular trigger wakeup cycle.

### Option B: Webhooks (instant, requires public endpoint)

If the gateway is reachable from the internet (e.g. via Tailscale Funnel, reverse proxy, or tunnel), configure GitHub webhooks for instant delivery:

```yaml
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      secret: "${GITHUB_WEBHOOK_SECRET}"
      classification: INTERNAL
      actions:
        - event: "pull_request_review"
          task: >
            A PR review was submitted. Read the PR tracking file from
            scratch/pr-tracking/ to recover context. Check out the branch,
            read the review, address any requested changes, commit, push,
            and comment on the PR with a summary of changes made.
        - event: "pull_request_review_comment"
          task: >
            An inline review comment was posted on a PR. Read the PR
            tracking file, check out the branch, address the specific
            comment, commit, push.
        - event: "issue_comment"
          task: >
            A comment was posted on a PR or issue. Check if this is a
            tracked PR by looking up tracking files in scratch/pr-tracking/.
            If tracked, check out the branch and address the feedback.
        - event: "pull_request.closed"
          task: >
            A PR was closed or merged. Read the tracking file. If merged,
            clean up: delete local branch, archive tracking file to
            completed/. Notify the owner of the merge. If closed without
            merge, archive and notify.
```

The GitHub webhook must be configured to send these event types:
- `Pull requests` (covers `pull_request.closed`)
- `Pull request reviews` (covers `pull_request_review`)
- `Pull request review comments` (covers `pull_request_review_comment`)
- `Issue comments` (covers `issue_comment`)

## Common Mistakes

| Mistake | Why It's Wrong | Fix |
|---------|---------------|-----|
| Working on main | Risk of pushing directly to production branch | Always create a feature branch first |
| One giant commit | Hard to review, hard to revert, loses history | Commit after each logical unit of work |
| Forgetting to push | PR has no changes, reviewer sees stale code | Push after every commit batch |
| Spin-looping for reviews | Blocks the agent, wastes resources | Write tracking file and stop; let triggers or webhooks handle it |
| Not writing tracking file | Cannot recover context when review arrives | Always write tracking file after opening PR |
| Auto-merging without permission | Owner may want to review before merge | Default to notify-only; respect `github.auto_merge` config |
| Committing secrets | Credentials exposed in git history | Never `git add .env` or credential files |
| Amending published commits | Force-push required, loses reviewer context | Create new commits for review fixes |
