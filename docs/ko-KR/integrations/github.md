# GitHub 통합

Triggerfish는 두 가지 상호 보완적인 접근 방식을 통해 GitHub와 통합됩니다:

## 빠른 설정: REST API 도구

GitHub를 연결하는 가장 빠른 방법입니다. 에이전트에게 리포지토리, PR, 이슈, Actions, 코드 검색을 위한 14개의 내장 도구를 제공합니다 -- 모두 분류 인식 taint 전파와 함께.

```bash
triggerfish connect github
```

이 명령은 세분화된 개인 접근 토큰 생성을 안내하고, 유효성을 검사하며, OS 키체인에 저장합니다. 이것으로 끝입니다 -- 에이전트가 이제 모든 `github_*` 도구를 사용할 수 있습니다.

Skill 작동 방식에 대한 자세한 내용은 [Skills 문서](/ko-KR/integrations/skills)를 참조하거나 `triggerfish skills list`를 실행하여 사용 가능한 모든 도구를 확인하십시오.

## 고급: `gh` CLI + Webhook

완전한 개발 피드백 루프(에이전트가 브랜치를 생성하고, PR을 열고, 코드 리뷰에 응답)를 위해 Triggerfish는 exec를 통한 `gh` CLI와 webhook 기반 리뷰 전달도 지원합니다. 이는 세 가지 조합 가능한 구성 요소를 사용합니다:

1. **exec를 통한 `gh` CLI** -- 모든 GitHub 동작 수행 (PR 생성, 리뷰 읽기, 코멘트, 병합)
2. **리뷰 전달** -- 두 가지 모드: **webhook 이벤트** (즉시, 공개 엔드포인트 필요) 또는 `gh pr view`를 통한 **트리거 기반 폴링** (방화벽 뒤에서 작동)
3. **git-branch-management skill** -- 에이전트에게 완전한 브랜치/PR/리뷰 워크플로우를 가르침

함께 사용하면 완전한 개발 피드백 루프를 만듭니다: 에이전트가 브랜치를 생성하고, 코드를 커밋하고, PR을 열고, 리뷰어 피드백에 응답합니다 -- 사용자 정의 GitHub API 코드가 필요 없습니다.

### 전제 조건

#### gh CLI

GitHub CLI(`gh`)가 Triggerfish가 실행되는 환경에 설치되고 인증되어 있어야 합니다.

```bash
# gh 설치 (Fedora/RHEL)
sudo dnf install gh

# gh 설치 (macOS)
brew install gh

# gh 설치 (Debian/Ubuntu)
sudo apt install gh

# 인증
gh auth login
```

인증을 확인합니다:

```bash
gh auth status
```

에이전트는 `exec.run("gh ...")`을 통해 `gh`를 사용합니다 -- `gh` 로그인 외에 별도의 GitHub 토큰 구성이 필요 없습니다.

### Git

Git이 설치되고 사용자 이름과 이메일이 구성되어 있어야 합니다:

```bash
git config --global user.name "Triggerfish Agent"
git config --global user.email "triggerfish@example.com"
```

### 리포지토리 접근

에이전트의 워크스페이스가 리모트에 대한 푸시 접근이 있는 git 리포지토리(또는 하나를 포함)여야 합니다.

## 리뷰 전달

에이전트가 새 PR 리뷰에 대해 알 수 있는 두 가지 방법이 있습니다. 하나를 선택하거나 둘 다 함께 사용할 수 있습니다.

### 옵션 A: 트리거 기반 폴링

인바운드 연결이 필요 없습니다. 에이전트가 `gh pr view`를 사용하여 스케줄에 따라 GitHub를 폴링합니다. 모든 방화벽, NAT, VPN 뒤에서 작동합니다.

`triggerfish.yaml`에 cron 작업을 추가합니다:

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

또는 에이전트의 TRIGGER.md에 "check open PRs for review feedback"을 추가하여 정기 트리거 웨이크업 사이클 중에 실행되도록 합니다.

### 옵션 B: Webhook 설정

Webhook은 리뷰 이벤트를 즉시 전달합니다. Triggerfish gateway가 GitHub 서버에서 접근 가능해야 합니다 (예: Tailscale Funnel, 리버스 프록시 또는 터널을 통해).

### 1단계: Webhook 시크릿 생성

```bash
openssl rand -hex 32
```

이것을 환경 변수로 저장합니다:

```bash
export GITHUB_WEBHOOK_SECRET="<generated-secret>"
```

재시작 후에도 유지되도록 셸 프로필 또는 시크릿 관리자에 추가합니다.

### 2단계: Triggerfish 구성

`triggerfish.yaml`에 webhook 엔드포인트를 추가합니다:

```yaml
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # secret stored in OS keychain
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

### 3단계: Webhook 엔드포인트 노출

Triggerfish의 gateway가 GitHub 서버에서 접근 가능해야 합니다. 옵션:

**Tailscale Funnel (개인 사용에 권장):**

```yaml
# triggerfish.yaml에서
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
```

이것은 `https://<your-machine>.ts.net/webhook/github`을 인터넷에 노출합니다.

**리버스 프록시 (nginx, Caddy):**

`/webhook/github`를 gateway의 로컬 포트로 포워딩합니다.

**ngrok (개발/테스트):**

```bash
ngrok http 8080
```

생성된 URL을 webhook 대상으로 사용합니다.

### 4단계: GitHub webhook 구성

GitHub 리포지토리(또는 조직)에서:

1. **Settings** > **Webhooks** > **Add webhook**으로 이동합니다
2. **Payload URL**을 노출된 엔드포인트로 설정합니다:
   ```
   https://<your-host>/webhook/github
   ```
3. **Content type**을 `application/json`으로 설정합니다
4. **Secret**을 `GITHUB_WEBHOOK_SECRET`과 동일한 값으로 설정합니다
5. **Which events would you like to trigger this webhook?** 아래에서 **Let me select individual events**를 선택하고 체크합니다:
   - **Pull requests** (`pull_request.opened`, `pull_request.closed` 포함)
   - **Pull request reviews** (`pull_request_review` 포함)
   - **Pull request review comments** (`pull_request_review_comment` 포함)
   - **Issue comments** (PR 및 이슈의 `issue_comment` 포함)
6. **Add webhook**을 클릭합니다

GitHub가 연결을 확인하기 위해 ping 이벤트를 보냅니다. Triggerfish 로그에서 수신을 확인합니다:

```bash
triggerfish logs --tail
```

## 피드백 루프 작동 방식

### Webhook 사용 시 (즉시)

<img src="/diagrams/github-webhook-review.svg" alt="GitHub webhook 리뷰 루프: 에이전트가 PR을 열고, 대기하고, 리뷰 시 webhook을 수신하고, 추적 파일을 읽고, 피드백을 처리하고, 커밋하고 푸시" style="max-width: 100%;" />

### 트리거 기반 폴링 사용 시 (방화벽 뒤)

<img src="/diagrams/github-trigger-review.svg" alt="GitHub 트리거 기반 리뷰: 에이전트가 PR을 열고, 추적 파일을 작성하고, 트리거 웨이크업을 기다리고, 리뷰를 폴링하고, 피드백을 처리" style="max-width: 100%;" />

두 경로 모두 동일한 추적 파일을 사용합니다. 에이전트는 `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`에서 PR 추적 파일을 읽어 컨텍스트를 복구합니다.

## PR 추적 파일

에이전트는 생성하는 각 PR에 대해 추적 파일을 작성합니다:

```
~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/<branch-name>.json
```

스키마:

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

병합 후 추적 파일은 `completed/`로 아카이브됩니다.

## 병합 정책

기본적으로 에이전트는 승인된 PR을 자동 병합하지 **않습니다**. 리뷰가 승인되면 에이전트는 소유자에게 알리고 명시적인 병합 지시를 기다립니다.

자동 병합을 활성화하려면 `triggerfish.yaml`에 추가합니다:

```yaml
github:
  auto_merge: true
```

활성화되면 에이전트는 승인 리뷰를 받은 후 `gh pr merge --squash --delete-branch`를 실행합니다.

::: warning 안전을 위해 자동 병합은 기본적으로 비활성화되어 있습니다. 에이전트의 변경 사항을 신뢰하고 GitHub에 브랜치 보호 규칙(필수 리뷰어, CI 검사)이 구성된 경우에만 활성화하십시오. :::

## 선택 사항: GitHub MCP 서버

`gh` CLI와 내장 도구가 제공하는 것 이상의 더 풍부한 GitHub API 접근이 필요한 경우 GitHub MCP 서버를 구성할 수도 있습니다:

```yaml
mcp_servers:
  - id: github
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    # GitHub token is read from the OS keychain
    classification: CONFIDENTIAL
```

대부분의 워크플로우에는 필요하지 않습니다 -- 내장 `github_*` 도구(`triggerfish connect github`로 설정)와 `gh` CLI가 모든 일반적인 작업을 처리합니다. MCP 서버는 내장 도구로 처리되지 않는 고급 쿼리에 유용합니다.

## 보안 고려 사항

| 제어                    | 세부 사항                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| **HMAC 검증**           | 모든 GitHub webhook은 처리 전에 HMAC-SHA256으로 검증됩니다 (webhook 모드)                             |
| **분류**                | GitHub 데이터는 기본적으로 `INTERNAL`로 분류됩니다 -- 코드와 PR 데이터가 공개 채널로 유출되지 않습니다 |
| **세션 격리**           | 각 webhook 이벤트 또는 트리거 웨이크업이 새로운 격리된 세션을 생성합니다                               |
| **No Write-Down**       | INTERNAL로 분류된 PR 이벤트에 대한 에이전트 응답은 PUBLIC 채널로 전송할 수 없습니다                    |
| **자격 증명 처리**      | `gh` CLI가 자체 인증 토큰을 관리합니다; triggerfish.yaml에 GitHub 토큰이 저장되지 않습니다             |
| **브랜치 명명**         | `triggerfish/` 접두사로 에이전트 브랜치를 쉽게 식별하고 필터링할 수 있습니다                           |

::: tip 리포지토리에 민감한 코드(독점, 보안 관련)가 포함된 경우 webhook 분류를 `INTERNAL` 대신 `CONFIDENTIAL`로 설정하는 것을 고려하십시오. :::

## 문제 해결

### Webhook이 이벤트를 수신하지 않음

1. 외부 머신에서 webhook URL에 접근 가능한지 확인합니다 (`curl`을 사용)
2. GitHub에서 **Settings** > **Webhooks**로 이동하여 **Recent Deliveries** 탭에서 오류를 확인합니다
3. 시크릿이 GitHub과 `GITHUB_WEBHOOK_SECRET` 사이에 일치하는지 확인합니다
4. Triggerfish 로그를 확인합니다: `triggerfish logs --tail`

### PR 리뷰가 감지되지 않음 (폴링 모드)

1. `pr-review-check` cron 작업이 `triggerfish.yaml`에 구성되어 있는지 확인합니다
2. 데몬이 실행 중인지 확인합니다: `triggerfish status`
3. `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`에 추적 파일이 존재하는지 확인합니다
4. 수동으로 테스트합니다: `gh pr view <number> --json reviews`
5. Triggerfish 로그를 확인합니다: `triggerfish logs --tail`

### gh CLI가 인증되지 않음

```bash
gh auth status
# 인증되지 않은 경우:
gh auth login
```

### 에이전트가 리모트에 푸시할 수 없음

git 리모트와 자격 증명을 확인합니다:

```bash
git remote -v
gh auth status
```

인증된 GitHub 계정이 리포지토리에 대한 푸시 접근 권한이 있는지 확인합니다.

### 리뷰 중 추적 파일을 찾을 수 없음

에이전트는 `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`에서 추적 파일을 찾습니다. 파일이 없으면 PR이 Triggerfish 외부에서 생성되었거나 워크스페이스가 정리되었을 수 있습니다. 에이전트는 소유자에게 알리고 자동 처리를 건너뛰어야 합니다.
