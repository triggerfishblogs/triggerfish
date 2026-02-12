---
name: github
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

### Repositories

| Tool | Description | Parameters |
|------|-------------|------------|
| `github_repos_list` | List your repos (sorted by updated) | `page`, `per_page` |
| `github_repos_read_file` | Read a file from a repo (max 1 MB) | `repo`*, `path`*, `ref` |
| `github_repos_commits` | List recent commits | `repo`*, `sha`, `per_page` |

### Pull Requests

| Tool | Description | Parameters |
|------|-------------|------------|
| `github_pulls_list` | List PRs | `repo`*, `state`, `per_page` |
| `github_pulls_create` | Create a PR | `repo`*, `title`*, `head`*, `base`*, `body` |
| `github_pulls_review` | Submit a review | `repo`*, `pr_number`*, `event`*, `body`* |
| `github_pulls_merge` | Merge a PR | `repo`*, `pr_number`*, `method`, `commit_title` |

### Issues

| Tool | Description | Parameters |
|------|-------------|------------|
| `github_issues_list` | List issues | `repo`*, `state`, `labels`, `per_page` |
| `github_issues_create` | Create an issue | `repo`*, `title`*, `body`, `labels` |
| `github_issues_comment` | Comment on issue/PR | `repo`*, `number`*, `body`* |

### Actions

| Tool | Description | Parameters |
|------|-------------|------------|
| `github_actions_runs` | List workflow runs | `repo`*, `workflow`, `branch`, `per_page` |
| `github_actions_trigger` | Trigger a workflow | `repo`*, `workflow`*, `ref`*, `inputs` |

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
