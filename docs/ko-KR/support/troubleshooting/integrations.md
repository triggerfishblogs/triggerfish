# 문제 해결: 통합

## Google Workspace

### OAuth 토큰 만료 또는 취소

Google OAuth refresh token은 취소될 수 있습니다(사용자, Google, 또는 비활동으로 인해). 이 경우:

```
Google OAuth token exchange failed
```

또는 Google API 호출에서 401 오류가 표시됩니다.

**해결 방법:** 재인증하십시오:

```bash
triggerfish connect google
```

이 명령은 OAuth 동의 흐름을 위한 브라우저를 엽니다. 액세스를 허용한 후 새 토큰이 keychain에 저장됩니다.

### "No refresh token"

OAuth 흐름이 access token을 반환했지만 refresh token은 반환하지 않았습니다. 다음과 같은 경우에 발생합니다:

- 이전에 앱을 이미 승인한 경우(Google은 첫 번째 승인 시에만 refresh token을 전송함)
- OAuth 동의 화면이 오프라인 액세스를 요청하지 않은 경우

**해결 방법:** [Google 계정 설정](https://myaccount.google.com/permissions)에서 앱의 액세스를 취소한 다음 `triggerfish connect google`을 다시 실행하십시오. 이번에는 Google이 새로운 refresh token을 전송합니다.

### 동시 갱신 방지

여러 요청이 동시에 토큰 갱신을 트리거하면 Triggerfish가 이를 직렬화하여 하나의 갱신 요청만 전송됩니다. 토큰 갱신 중 타임아웃이 발생하면 첫 번째 갱신이 너무 오래 걸리고 있을 수 있습니다.

---

## GitHub

### "GitHub token not found in keychain"

GitHub 통합은 Personal Access Token을 OS keychain에 `github-pat` 키로 저장합니다.

**해결 방법:**

```bash
triggerfish connect github
# 또는 수동으로:
triggerfish config set-secret github-pat ghp_...
```

### 토큰 형식

GitHub는 두 가지 토큰 형식을 지원합니다:
- Classic PAT: `ghp_...`
- Fine-grained PAT: `github_pat_...`

둘 다 작동합니다. 설정 마법사는 GitHub API를 호출하여 토큰을 검증합니다. 검증이 실패하면:

```
GitHub token verification failed
GitHub API request failed
```

토큰에 필요한 스코프가 있는지 다시 확인하십시오. 전체 기능을 위해서는 `repo`, `read:org`, `read:user`가 필요합니다.

### 클론 실패

GitHub 클론 도구에는 자동 재시도 로직이 있습니다:

1. 첫 번째 시도: 지정된 `--branch`로 클론
2. 브랜치가 존재하지 않으면: `--branch` 없이 재시도(기본 브랜치 사용)

두 시도 모두 실패하면:

```
Clone failed on retry
Clone failed
```

확인 사항:
- 토큰에 `repo` 스코프가 있는지
- 리포지토리가 존재하고 토큰에 액세스 권한이 있는지
- github.com에 대한 네트워크 연결

### 속도 제한

GitHub의 API 속도 제한은 인증된 요청에 대해 시간당 5,000건입니다. 남은 속도 제한 횟수와 재설정 시간이 응답 헤더에서 추출되어 오류 메시지에 포함됩니다:

```
Rate limit: X remaining, resets at HH:MM:SS
```

자동 백오프는 없습니다. 속도 제한 기간이 재설정될 때까지 기다리십시오.

---

## Notion

### "Notion enabled but token not found in keychain"

Notion 통합에는 keychain에 저장된 내부 통합 토큰이 필요합니다.

**해결 방법:**

```bash
triggerfish connect notion
```

이 명령은 토큰을 입력받고 Notion API로 검증한 후 keychain에 저장합니다.

### 토큰 형식

Notion은 두 가지 토큰 형식을 사용합니다:
- 내부 통합 토큰: `ntn_...`
- 레거시 토큰: `secret_...`

둘 다 허용됩니다. 연결 마법사가 저장 전에 형식을 검증합니다.

### 속도 제한 (429)

Notion의 API는 초당 약 3건의 요청으로 속도가 제한됩니다. Triggerfish에는 내장 속도 제한(구성 가능) 및 재시도 로직이 있습니다:

- 기본 속도: 초당 3건
- 재시도: 429에서 최대 3회
- 백오프: 1초부터 시작하는 지터가 포함된 지수 백오프
- Notion 응답의 `Retry-After` 헤더를 따름

여전히 속도 제한에 도달하면:

```
Notion API rate limited, retrying
```

동시 작업을 줄이거나 구성에서 속도 제한을 낮추십시오.

### 404 Not Found

```
Notion: 404 Not Found
```

리소스가 존재하지만 통합과 공유되지 않았습니다. Notion에서:

1. 페이지 또는 데이터베이스를 열으십시오
2. "..." 메뉴 > "Connections"를 클릭하십시오
3. Triggerfish 통합을 추가하십시오

### "client_secret removed" (주요 변경 사항)

보안 업데이트에서 `client_secret` 필드가 Notion 구성에서 제거되었습니다. `triggerfish.yaml`에 이 필드가 있으면 제거하십시오. Notion은 이제 keychain에 저장된 OAuth 토큰만 사용합니다.

### 네트워크 오류

```
Notion API network request failed
Notion API network error: <message>
```

API에 접근할 수 없습니다. 네트워크 연결을 확인하십시오. 기업 프록시 뒤에 있는 경우 Notion의 API(`api.notion.com`)에 접근할 수 있어야 합니다.

---

## CalDAV (캘린더)

### 자격 증명 해석 실패

```
CalDAV credential resolution failed: missing username
CalDAV credential resolution failed: secret not found
```

CalDAV 통합에는 사용자 이름과 비밀번호가 필요합니다:

```yaml
caldav:
  server_url: "https://calendar.example.com/dav"
  username: "your-username"
  credential_ref: "secret:caldav:password"
```

비밀번호를 저장하십시오:

```bash
triggerfish config set-secret caldav:password <your-password>
```

### 디스커버리 실패

CalDAV는 다단계 디스커버리 프로세스를 사용합니다:
1. principal URL 찾기(well-known 엔드포인트에 PROPFIND)
2. calendar-home-set 찾기
3. 사용 가능한 캘린더 나열

어떤 단계든 실패하면:

```
CalDAV principal discovery failed
CalDAV calendar-home-set discovery failed
CalDAV calendar listing failed
```

일반적인 원인:
- 잘못된 서버 URL(일부 서버는 `/dav/principals/` 또는 `/remote.php/dav/`가 필요함)
- 자격 증명 거부(잘못된 사용자 이름/비밀번호)
- 서버가 CalDAV를 지원하지 않음(일부 서버는 WebDAV를 제공하지만 CalDAV는 제공하지 않음)

### 업데이트/삭제 시 ETag 불일치

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

CalDAV는 낙관적 동시성 제어를 위해 ETag를 사용합니다. 읽기와 업데이트 사이에 다른 클라이언트(휴대폰, 웹)가 이벤트를 수정하면 ETag가 일치하지 않습니다.

**해결 방법:** 에이전트가 현재 ETag를 가져오기 위해 이벤트를 다시 가져온 다음 작업을 재시도해야 합니다. 대부분의 경우 자동으로 처리됩니다.

### "CalDAV credentials not available, executor deferred"

자격 증명을 시작 시 해석할 수 없으면 CalDAV executor가 지연된 상태로 시작합니다. 이것은 치명적이지 않습니다. CalDAV 도구를 사용하려고 하면 executor가 오류를 보고합니다.

---

## MCP (Model Context Protocol) 서버

### 서버를 찾을 수 없음

```
MCP server '<name>' not found
```

도구 호출이 구성되지 않은 MCP 서버를 참조합니다. `triggerfish.yaml`의 `mcp_servers` 섹션을 확인하십시오.

### 서버 바이너리가 PATH에 없음

MCP 서버는 서브프로세스로 생성됩니다. 바이너리를 찾을 수 없는 경우:

```
MCP server '<name>': <validation error>
```

일반적인 문제:
- 명령(예: `npx`, `python`, `node`)이 daemon의 PATH에 없음
- **systemd/launchd PATH 문제:** daemon은 설치 시 PATH를 캡처합니다. daemon 설치 후 MCP 서버 도구를 설치한 경우 daemon을 다시 설치하여 PATH를 업데이트하십시오:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### 서버 충돌

MCP 서버 프로세스가 충돌하면 읽기 루프가 종료되고 서버를 사용할 수 없게 됩니다. 자동 재연결은 없습니다.

**해결 방법:** 모든 MCP 서버를 다시 생성하려면 daemon을 재시작하십시오.

### SSE 전송 차단

SSE(Server-Sent Events) 전송을 사용하는 MCP 서버는 SSRF 검사 대상입니다:

```
MCP SSE connection blocked by SSRF policy
```

사설 IP 주소를 가리키는 SSE URL은 차단됩니다. 이것은 의도된 동작입니다. 로컬 MCP 서버에는 대신 stdio 전송을 사용하십시오.

### 도구 호출 오류

```
tools/list failed: <message>
tools/call failed: <message>
```

MCP 서버가 오류로 응답했습니다. 이것은 Triggerfish가 아닌 서버의 오류입니다. 자세한 내용은 MCP 서버의 자체 로그를 확인하십시오.

---

## Obsidian

### "Vault path does not exist"

```
Vault path does not exist: /path/to/vault
```

`plugins.obsidian.vault_path`에 구성된 vault 경로가 존재하지 않습니다. 경로가 올바르고 접근 가능한지 확인하십시오.

### 경로 탐색 차단

```
Path traversal rejected: <path>
Path escapes vault boundary: <path>
```

노트 경로가 vault 디렉토리를 벗어나려고 시도했습니다(예: `../` 사용). 이것은 보안 검사입니다. 모든 노트 작업은 vault 디렉토리 내로 제한됩니다.

### 제외된 폴더

```
Path is excluded: <path>
```

노트가 `exclude_folders`에 나열된 폴더에 있습니다. 접근하려면 제외 목록에서 해당 폴더를 제거하십시오.

### Classification 적용

```
Obsidian read blocked: classification exceeds session taint
Obsidian write-down blocked
```

vault 또는 특정 폴더에 세션 taint와 충돌하는 classification 수준이 있습니다. Write-down 규칙에 대한 자세한 내용은 [보안 문제 해결](/ko-KR/support/troubleshooting/security)을 참조하십시오.
