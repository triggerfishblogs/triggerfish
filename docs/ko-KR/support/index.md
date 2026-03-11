# 지원 센터

Triggerfish 설치, 구성 및 일상 운영에 대한 도움을 받으십시오.

## 빠른 링크

- **지금 문제가 발생했습니까?** [문제 해결 가이드](/ko-KR/support/troubleshooting/)부터 시작하십시오
- **오류를 조회해야 합니까?** [오류 레퍼런스](/ko-KR/support/troubleshooting/error-reference)를 참조하십시오
- **버그를 신고하시겠습니까?** 먼저 [좋은 이슈 작성 방법](/ko-KR/support/guides/filing-issues)을 읽어 주십시오
- **업그레이드 또는 마이그레이션 중이십니까?** [지식 베이스](#지식-베이스)를 확인하십시오

## 셀프 서비스 리소스

### 문제 해결

일반적인 문제를 진단하고 수정하기 위한 단계별 가이드로, 영역별로 정리되어 있습니다:

| 영역 | 포함 내용 |
|------|--------|
| [설치](/ko-KR/support/troubleshooting/installation) | 설치 실패, 권한 오류, 플랫폼별 설정 |
| [Daemon](/ko-KR/support/troubleshooting/daemon) | 시작/중지 문제, 서비스 관리, 포트 충돌 |
| [구성](/ko-KR/support/troubleshooting/configuration) | YAML 파싱, 유효성 검사 오류, secret 참조 |
| [채널](/ko-KR/support/troubleshooting/channels) | Telegram, Slack, Discord, WhatsApp, Signal, Email, WebChat |
| [LLM Provider](/ko-KR/support/troubleshooting/providers) | API 키 오류, 모델 미발견, 스트리밍 실패, failover |
| [통합](/ko-KR/support/troubleshooting/integrations) | Google, GitHub, Notion, CalDAV, MCP 서버 |
| [브라우저 자동화](/ko-KR/support/troubleshooting/browser) | Chrome 감지, 실행 실패, Flatpak, 내비게이션 |
| [보안 & Classification](/ko-KR/support/troubleshooting/security) | Taint 상승, write-down 차단, SSRF, 정책 거부 |
| [Secrets & 자격 증명](/ko-KR/support/troubleshooting/secrets) | Keychain 백엔드, 권한 오류, 암호화된 파일 저장소 |
| [오류 레퍼런스](/ko-KR/support/troubleshooting/error-reference) | 모든 오류 메시지의 검색 가능한 인덱스 |

### 사용 가이드

| 가이드 | 설명 |
|-------|-------------|
| [로그 수집](/ko-KR/support/guides/collecting-logs) | 버그 리포트를 위한 로그 번들 수집 방법 |
| [진단 실행](/ko-KR/support/guides/diagnostics) | `triggerfish patrol` 및 healthcheck 도구 사용법 |
| [이슈 작성](/ko-KR/support/guides/filing-issues) | 이슈가 빠르게 해결되도록 포함해야 할 내용 |
| [플랫폼 참고 사항](/ko-KR/support/guides/platform-notes) | macOS, Linux, Windows, Docker 및 Flatpak 관련 사항 |

### 지식 베이스

| 문서 | 설명 |
|---------|-------------|
| [Secrets 마이그레이션](/ko-KR/support/kb/secrets-migration) | 평문에서 암호화된 secret 저장소로의 마이그레이션 |
| [자체 업데이트 프로세스](/ko-KR/support/kb/self-update) | `triggerfish update` 작동 방식과 발생 가능한 문제 |
| [주요 변경 사항](/ko-KR/support/kb/breaking-changes) | 버전별 주요 변경 사항 목록 |
| [알려진 문제](/ko-KR/support/kb/known-issues) | 현재 알려진 문제와 해결 방법 |

## 아직 해결되지 않았습니까?

위 문서로 문제가 해결되지 않은 경우:

1. **기존 이슈를 검색하십시오.** [GitHub Issues](https://github.com/greghavens/triggerfish/issues)에서 이미 보고된 내용이 있는지 확인하십시오
2. **커뮤니티에 문의하십시오.** [GitHub Discussions](https://github.com/greghavens/triggerfish/discussions)에서 질문하십시오
3. **새 이슈를 작성하십시오.** [이슈 작성 가이드](/ko-KR/support/guides/filing-issues)를 참고하여 작성하십시오
