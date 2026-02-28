---
name: github
version: 2.0.0
description: >
  GitHub integration for managing repositories, pull requests, issues,
  Actions workflows, and code search via the GitHub REST API. Authenticates
  with a Personal Access Token (PAT). Repository visibility maps to
  classification levels — accessing private repos escalates session taint.
classification_ceiling: CONFIDENTIAL
requires_tools:
  - github
network_domains:
  - api.github.com
  - github.com
---

# GitHub

Interact with GitHub repositories, pull requests, issues, Actions, and code search.

## Authentication

Requires a GitHub Personal Access Token (PAT) stored in the OS keychain.

Setup: `triggerfish connect github`

## Tools

All tool names follow the `github_verb_noun` pattern.

### Repositories

| Tool | Description | Parameters |
|------|-------------|------------|
| `github_list_repos` | List your repos (sorted by updated) | `page`, `per_page` |
| `github_get_repo` | Get repo details (description, language, clone URLs, stars) | `repo`* |
| `github_read_file` | Read a file from a repo (max 1 MB) | `repo`*, `path`*, `ref` |
| `github_list_commits` | List recent commits | `repo`*, `sha`, `per_page` |
| `github_list_branches` | List branches with protection status | `repo`*, `per_page` |
| `github_create_branch` | Create a branch from a SHA | `repo`*, `branch`*, `sha`* |
| `github_delete_branch` | Delete a branch | `repo`*, `branch`* |

### Pull Requests

| Tool | Description | Parameters |
|------|-------------|------------|
| `github_list_pulls` | List PRs | `repo`*, `state`, `per_page` |
| `github_get_pull` | Get PR details (body, diff stats, mergeable) | `repo`*, `pr_number`* |
| `github_create_pull` | Create a PR | `repo`*, `title`*, `head`*, `base`*, `body` |
| `github_update_pull` | Update a PR (title, body, base, state) | `repo`*, `pr_number`*, `title`, `body`, `base`, `state` |
| `github_list_pull_files` | List changed files in a PR | `repo`*, `pr_number`*, `per_page` |
| `github_review_pull` | Submit a review | `repo`*, `pr_number`*, `event`*, `body`* |
| `github_merge_pull` | Merge a PR | `repo`*, `pr_number`*, `method`, `commit_title` |

### Issues

| Tool | Description | Parameters |
|------|-------------|------------|
| `github_list_issues` | List issues | `repo`*, `state`, `labels`, `per_page` |
| `github_get_issue` | Get issue details (body, assignees, labels) | `repo`*, `number`* |
| `github_create_issue` | Create an issue | `repo`*, `title`*, `body`, `labels` |
| `github_update_issue` | Update an issue (title, body, state, labels, assignees) | `repo`*, `number`*, `title`, `body`, `state`, `labels`, `assignees` |
| `github_list_comments` | List comments on issue/PR | `repo`*, `number`*, `per_page` |
| `github_add_comment` | Comment on issue/PR | `repo`*, `number`*, `body`* |

### Actions

| Tool | Description | Parameters |
|------|-------------|------------|
| `github_list_runs` | List workflow runs | `repo`*, `workflow`, `branch`, `per_page` |
| `github_cancel_run` | Cancel a workflow run | `repo`*, `run_id`* |
| `github_trigger_workflow` | Trigger a workflow | `repo`*, `workflow`*, `ref`*, `inputs` |

### Search

| Tool | Description | Parameters |
|------|-------------|------------|
| `github_search_code` | Search code across repos | `query`*, `per_page` |
| `github_search_issues` | Search issues/PRs across repos | `query`*, `per_page` |

*Required parameters marked with asterisk.

## Classification Rules

- **Public** repos → `PUBLIC` classification
- **Private** repos → `CONFIDENTIAL` classification
- **Internal** repos → `INTERNAL` classification
- Per-repo overrides configurable in `triggerfish.yaml` under `github.classification_overrides`
- Every response includes `_classification` for taint propagation

## Repo Parameter Format

Always use `"owner/name"` format (e.g. `"octocat/Hello-World"`).
