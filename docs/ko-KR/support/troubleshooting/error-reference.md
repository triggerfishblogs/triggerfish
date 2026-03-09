# 오류 레퍼런스

오류 메시지의 검색 가능한 인덱스입니다. 브라우저의 찾기(Ctrl+F / Cmd+F)를 사용하여 로그에 표시된 정확한 오류 텍스트를 검색하십시오.

## 시작 & Daemon

| 오류 | 원인 | 해결 방법 |
|-------|-------|-----|
| `Fatal startup error` | Gateway 부팅 중 처리되지 않은 예외 | 로그에서 전체 스택 트레이스를 확인 |
| `Daemon start failed` | 서비스 관리자가 daemon을 시작할 수 없음 | `triggerfish logs` 또는 시스템 journal 확인 |
| `Daemon stop failed` | 서비스 관리자가 daemon을 중지할 수 없음 | 프로세스를 수동으로 종료 |
| `Failed to load configuration` | 구성 파일을 읽을 수 없거나 형식이 잘못됨 | `triggerfish config validate` 실행 |
| `No LLM provider configured. Check triggerfish.yaml.` | `models` 섹션 누락 또는 provider 미정의 | 최소 하나의 provider 구성 |
| `Configuration file not found` | 예상 경로에 `triggerfish.yaml`이 존재하지 않음 | `triggerfish dive` 실행 또는 수동 생성 |
| `Configuration parse failed` | YAML 구문 오류 | YAML 구문 수정 (들여쓰기, 콜론, 인용부호 확인) |
| `Configuration file did not parse to an object` | YAML 파싱 되었으나 결과가 매핑이 아님 | 최상위가 목록이나 스칼라가 아닌 YAML 매핑인지 확인 |
| `Configuration validation failed` | 필수 필드 누락 또는 유효하지 않은 값 | 구체적인 유효성 검사 메시지 확인 |
| `Triggerfish is already running` | 다른 인스턴스에 의해 로그 파일이 잠김 | 먼저 실행 중인 인스턴스를 중지 |
| `Linger enable failed` | `loginctl enable-linger`가 성공하지 못함 | `sudo loginctl enable-linger $USER` 실행 |

## Secret 관리

| 오류 | 원인 | 해결 방법 |
|-------|-------|-----|
| `Secret store failed` | Secret 백엔드를 초기화할 수 없음 | keychain/libsecret 사용 가능 여부 확인 |
| `Secret not found` | 참조된 secret 키가 존재하지 않음 | 저장: `triggerfish config set-secret <key> <value>` |
| `Machine key file permissions too open` | 키 파일 권한이 0600보다 넓음 | `chmod 600 ~/.triggerfish/secrets.key` |
| `Machine key file corrupt` | 키 파일을 읽을 수 없거나 잘림 | 삭제 후 모든 secret 재저장 |
| `Machine key chmod failed` | 키 파일에 권한을 설정할 수 없음 | 파일 시스템이 chmod를 지원하는지 확인 |
| `Secret file permissions too open` | Secrets 파일 권한이 너무 개방적 | `chmod 600 ~/.triggerfish/secrets.json` |
| `Secret file chmod failed` | Secrets 파일에 권한을 설정할 수 없음 | 파일 시스템 유형 확인 |
| `Secret backend selection failed` | 지원되지 않는 OS 또는 keychain 없음 | Docker 사용 또는 메모리 대체 활성화 |
| `Migrating legacy plaintext secrets to encrypted format` | 이전 형식 secrets 파일 감지 (INFO, 오류 아님) | 조치 필요 없음; 마이그레이션은 자동 |

## LLM Provider

| 오류 | 원인 | 해결 방법 |
|-------|-------|-----|
| `Primary provider not found in registry` | `models.primary.provider`의 provider 이름이 `models.providers`에 없음 | provider 이름 수정 |
| `Classification model provider not configured` | `classification_models`가 알 수 없는 provider 참조 | `models.providers`에 provider 추가 |
| `All providers exhausted` | Failover 체인의 모든 provider가 실패 | 모든 API 키와 provider 상태 확인 |
| `Provider request failed with retryable error, retrying` | 일시적 오류, 재시도 진행 중 | 대기; 자동 복구 |
| `Provider stream connection failed, retrying` | 스트리밍 연결 끊김 | 대기; 자동 복구 |
| `Local LLM request failed (status): text` | Ollama/LM Studio가 오류 반환 | 로컬 서버가 실행 중이고 모델이 로드되었는지 확인 |
| `No response body for streaming` | Provider가 빈 스트리밍 응답 반환 | 재시도; 일시적 provider 문제일 수 있음 |
| `Unknown provider name in createProviderByName` | 존재하지 않는 provider 유형 참조 | provider 이름 철자 확인 |

## 채널

| 오류 | 원인 | 해결 방법 |
|-------|-------|-----|
| `Channel send failed` | 라우터가 메시지를 전달할 수 없음 | 로그에서 채널별 오류 확인 |
| `WebSocket connection failed` | CLI 채팅이 gateway에 접근할 수 없음 | daemon이 실행 중인지 확인 |
| `Message parse failed` | 채널에서 잘못된 JSON 수신 | 클라이언트가 유효한 JSON을 전송하는지 확인 |
| `WebSocket upgrade rejected` | Gateway가 연결을 거부 | auth 토큰과 origin 헤더 확인 |
| `Chat WebSocket message rejected: exceeds size limit` | 메시지 본문이 1 MB 초과 | 더 작은 메시지 전송 |
| `Discord channel configured but botToken is missing` | Discord 구성은 있지만 토큰이 비어 있음 | 봇 토큰 설정 |
| `WhatsApp send failed (status): error` | Meta API가 전송 요청을 거부 | access token 유효성 확인 |
| `Signal connect failed` | signal-cli daemon에 접근할 수 없음 | signal-cli가 실행 중인지 확인 |
| `Signal ping failed after retries` | signal-cli가 실행 중이지만 응답하지 않음 | signal-cli 재시작 |
| `signal-cli daemon not reachable within 60s` | signal-cli가 시간 내에 시작되지 않음 | Java 설치 및 signal-cli 설정 확인 |
| `IMAP LOGIN failed` | 잘못된 IMAP 자격 증명 | 사용자 이름과 비밀번호 확인 |
| `IMAP connection not established` | IMAP 서버에 접근할 수 없음 | 서버 호스트 이름과 포트 993 확인 |
| `Google Chat PubSub poll failed` | Pub/Sub 구독에서 pull할 수 없음 | Google Cloud 자격 증명 확인 |
| `Clipboard image rejected: exceeds size limit` | 붙여넣은 이미지가 입력 버퍼에 비해 너무 큼 | 더 작은 이미지 사용 |

## 통합

| 오류 | 원인 | 해결 방법 |
|-------|-------|-----|
| `Google OAuth token exchange failed` | OAuth 코드 교환이 오류 반환 | 재인증: `triggerfish connect google` |
| `GitHub token verification failed` | PAT가 유효하지 않거나 만료됨 | 재저장: `triggerfish connect github` |
| `GitHub API request failed` | GitHub API가 오류 반환 | 토큰 스코프와 속도 제한 확인 |
| `Clone failed` | git clone 실패 | 토큰, 리포지토리 액세스, 네트워크 확인 |
| `Notion enabled but token not found in keychain` | Notion 통합 토큰이 저장되지 않음 | `triggerfish connect notion` 실행 |
| `Notion API rate limited` | 초당 3건 초과 | 자동 재시도 대기 (최대 3회) |
| `Notion API network request failed` | api.notion.com에 접근할 수 없음 | 네트워크 연결 확인 |
| `CalDAV credential resolution failed` | CalDAV 사용자 이름 또는 비밀번호 누락 | 구성 및 keychain에 자격 증명 설정 |
| `CalDAV principal discovery failed` | CalDAV principal URL을 찾을 수 없음 | 서버 URL 형식 확인 |
| `MCP server 'name' not found` | 참조된 MCP 서버가 구성에 없음 | 구성의 `mcp_servers`에 추가 |
| `MCP SSE connection blocked by SSRF policy` | MCP SSE URL이 사설 IP를 가리킴 | 대신 stdio 전송 사용 |
| `Vault path does not exist` | Obsidian vault 경로가 잘못됨 | `plugins.obsidian.vault_path` 수정 |
| `Path traversal rejected` | 노트 경로가 vault 디렉토리를 벗어나려 함 | vault 내의 경로 사용 |

## 보안 & 정책

| 오류 | 원인 | 해결 방법 |
|-------|-------|-----|
| `Write-down blocked` | 높은 classification에서 낮은 classification으로 데이터 흐름 | 적절한 classification 수준의 채널/도구 사용 |
| `SSRF blocked: hostname resolves to private IP` | 아웃바운드 요청이 내부 네트워크를 대상으로 함 | 비활성화 불가; 공개 URL 사용 |
| `Hook evaluation failed, defaulting to BLOCK` | 정책 hook이 예외를 발생시킴 | 사용자 정의 정책 규칙 확인 |
| `Policy rule blocked action` | 정책 규칙이 동작을 거부 | 구성의 `policy.rules` 검토 |
| `Tool floor violation` | 도구가 세션보다 높은 classification 필요 | 세션 상승 또는 다른 도구 사용 |
| `Plugin network access blocked` | 플러그인이 승인되지 않은 URL에 접근 시도 | 플러그인이 매니페스트에 엔드포인트를 선언해야 함 |
| `Plugin SSRF blocked` | 플러그인 URL이 사설 IP로 해석 | 플러그인은 사설 네트워크에 접근 불가 |
| `Skill activation blocked by classification ceiling` | 세션 taint가 skill의 ceiling을 초과 | 현재 taint 수준에서 이 skill 사용 불가 |
| `Skill content integrity check failed` | 설치 후 skill 파일이 수정됨 | Skill 재설치 |
| `Skill install rejected by scanner` | 보안 스캐너가 의심스러운 콘텐츠 발견 | 스캔 경고 검토 |
| `Delegation certificate signature invalid` | 위임 체인에 유효하지 않은 서명 | 위임 재발급 |
| `Delegation certificate expired` | 위임이 만료됨 | 더 긴 TTL로 재발급 |
| `Webhook HMAC verification failed` | Webhook 서명이 일치하지 않음 | 공유 secret 구성 확인 |
| `Webhook replay detected` | 중복 webhook 페이로드 수신 | 예상된 경우 오류 아님; 그렇지 않으면 조사 |
| `Webhook rate limit exceeded` | 한 소스에서 너무 많은 webhook 호출 | Webhook 빈도 줄이기 |

## 브라우저

| 오류 | 원인 | 해결 방법 |
|-------|-------|-----|
| `Browser launch failed` | Chrome/Chromium을 시작할 수 없음 | Chromium 기반 브라우저 설치 |
| `Direct Chrome process launch failed` | Chrome 바이너리 실행 실패 | 바이너리 권한 및 종속성 확인 |
| `Flatpak Chrome launch failed` | Flatpak Chrome 래퍼 실패 | Flatpak 설치 확인 |
| `CDP endpoint not ready after Xms` | Chrome이 시간 내에 디버그 포트를 열지 못함 | 시스템 리소스가 부족할 수 있음 |
| `Navigation blocked by domain policy` | URL이 차단된 도메인 또는 사설 IP를 대상으로 함 | 공개 URL 사용 |
| `Navigation failed` | 페이지 로드 오류 또는 타임아웃 | URL 및 네트워크 확인 |
| `Click/Type/Select failed on "selector"` | CSS 선택자가 어떤 요소와도 일치하지 않음 | 페이지 DOM에서 선택자 확인 |
| `Snapshot failed` | 페이지 상태를 캡처할 수 없음 | 페이지가 비어 있거나 JavaScript 오류 |

## 실행 & 샌드박스

| 오류 | 원인 | 해결 방법 |
|-------|-------|-----|
| `Working directory path escapes workspace jail` | exec 환경에서 경로 탐색 시도 | 작업 공간 내의 경로 사용 |
| `Working directory does not exist` | 지정된 작업 디렉토리 미발견 | 먼저 디렉토리 생성 |
| `Workspace access denied for PUBLIC session` | PUBLIC 세션은 작업 공간 사용 불가 | 작업 공간에는 INTERNAL+ classification 필요 |
| `Workspace path traversal attempt blocked` | 경로가 작업 공간 경계를 벗어나려 함 | 작업 공간 내 상대 경로 사용 |
| `Workspace agentId rejected: empty after sanitization` | 에이전트 ID에 유효하지 않은 문자만 포함 | 에이전트 구성 확인 |
| `Sandbox worker unhandled error` | 플러그인 샌드박스 worker 충돌 | 플러그인 코드 오류 확인 |
| `Sandbox has been shut down` | 파괴된 샌드박스에서 작업 시도 | Daemon 재시작 |

## 스케줄러

| 오류 | 원인 | 해결 방법 |
|-------|-------|-----|
| `Trigger callback failed` | Trigger 핸들러가 예외 발생 | TRIGGER.md 문제 확인 |
| `Trigger store persist failed` | Trigger 결과를 저장할 수 없음 | 스토리지 연결 확인 |
| `Notification delivery failed` | Trigger 알림을 보낼 수 없음 | 채널 연결 확인 |
| `Cron expression parse error` | 유효하지 않은 cron 표현식 | `scheduler.cron.jobs`의 표현식 수정 |

## 자체 업데이트

| 오류 | 원인 | 해결 방법 |
|-------|-------|-----|
| `Triggerfish self-update failed` | 업데이트 프로세스에서 오류 발생 | 로그에서 구체적 오류 확인 |
| `Binary replacement failed` | 이전 바이너리를 새 것으로 교체할 수 없음 | 파일 권한 확인; 먼저 daemon 중지 |
| `Checksum file download failed` | SHA256SUMS.txt를 다운로드할 수 없음 | 네트워크 연결 확인 |
| `Asset not found in SHA256SUMS.txt` | 릴리스에 해당 플랫폼의 체크섬이 없음 | GitHub issue 작성 |
| `Checksum verification exception` | 다운로드한 바이너리 해시가 일치하지 않음 | 재시도; 다운로드가 손상되었을 수 있음 |
