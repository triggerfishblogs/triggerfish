# 문제 해결

문제가 발생하면 여기서 시작하십시오. 단계를 순서대로 따라 주십시오.

## 첫 번째 단계

### 1. Daemon이 실행 중인지 확인

```bash
triggerfish status
```

Daemon이 실행 중이 아닌 경우 시작하십시오:

```bash
triggerfish start
```

### 2. 로그 확인

```bash
triggerfish logs
```

이 명령은 로그 파일을 실시간으로 tail합니다. 레벨 필터를 사용하여 노이즈를 줄이십시오:

```bash
triggerfish logs --level ERROR
triggerfish logs --level WARN
```

### 3. 진단 실행

```bash
triggerfish patrol
```

Patrol은 gateway 접근 가능 여부, LLM provider 응답 여부, 채널 연결 여부, 정책 규칙 로드 여부, skill 검색 여부를 확인합니다. `CRITICAL` 또는 `WARNING`으로 표시된 항목이 집중해야 할 부분을 알려줍니다.

### 4. 구성 유효성 검사

```bash
triggerfish config validate
```

이 명령은 `triggerfish.yaml`을 파싱하고, 필수 필드를 확인하고, classification 수준을 검증하고, secret 참조를 해석합니다.

## 영역별 문제 해결

위의 첫 번째 단계로 문제를 파악하지 못한 경우, 증상에 맞는 영역을 선택하십시오:

- [설치](/ko-KR/support/troubleshooting/installation) - 설치 스크립트 실패, 소스 빌드 문제, 플랫폼 문제
- [Daemon](/ko-KR/support/troubleshooting/daemon) - 서비스 시작 불가, 포트 충돌, "already running" 오류
- [구성](/ko-KR/support/troubleshooting/configuration) - YAML 파싱 오류, 누락된 필드, secret 해석 실패
- [채널](/ko-KR/support/troubleshooting/channels) - 봇 응답 없음, 인증 실패, 메시지 전달 문제
- [LLM Provider](/ko-KR/support/troubleshooting/providers) - API 오류, 모델 미발견, 스트리밍 실패
- [통합](/ko-KR/support/troubleshooting/integrations) - Google OAuth, GitHub PAT, Notion API, CalDAV, MCP 서버
- [브라우저 자동화](/ko-KR/support/troubleshooting/browser) - Chrome 미발견, 실행 실패, 내비게이션 차단
- [보안 & Classification](/ko-KR/support/troubleshooting/security) - write-down 차단, taint 문제, SSRF, 정책 거부
- [Secrets & 자격 증명](/ko-KR/support/troubleshooting/secrets) - keychain 오류, 암호화된 파일 저장소, 권한 문제

## 아직 해결되지 않았습니까?

위 가이드 중 어느 것으로도 문제가 해결되지 않은 경우:

1. [로그 번들](/ko-KR/support/guides/collecting-logs)을 수집하십시오
2. [이슈 작성 가이드](/ko-KR/support/guides/filing-issues)를 읽어 주십시오
3. [GitHub](https://github.com/greghavens/triggerfish/issues/new)에서 이슈를 열어 주십시오
