# 분류 수준 선택

Triggerfish의 모든 채널, MCP 서버, 통합, plugin에는 분류 수준이 있어야 합니다. 이 페이지는 적합한 수준을 선택하는 데 도움을 줍니다.

## 네 가지 수준

| 수준             | 의미                                                  | 데이터 흐름 대상...                |
| ---------------- | ----------------------------------------------------- | ---------------------------------- |
| **PUBLIC**       | 누구나 볼 수 있는 안전한 정보                         | 어디로든                           |
| **INTERNAL**     | 개인 전용 -- 민감하지 않지만 공개되지 않는 정보       | INTERNAL, CONFIDENTIAL, RESTRICTED |
| **CONFIDENTIAL** | 절대 유출되어서는 안 되는 민감한 데이터               | CONFIDENTIAL, RESTRICTED           |
| **RESTRICTED**   | 가장 민감 -- 법률, 의료, 금융, PII                    | RESTRICTED만                       |

데이터는 **위로 또는 같은 수준으로만** 흐를 수 있으며, 아래로는 절대 흐르지 않습니다. 이것이 [no-write-down 규칙](/ko-KR/security/no-write-down)이며 재정의할 수 없습니다.

## 두 가지 질문

구성하는 모든 통합에 대해 다음을 물어보십시오:

**1. 이 소스가 반환할 수 있는 가장 민감한 데이터는 무엇입니까?**

이것이 **최소** 분류 수준을 결정합니다. MCP 서버가 금융 데이터를 반환할 수 있다면, 대부분의 도구가 무해한 메타데이터를 반환하더라도 최소 CONFIDENTIAL이어야 합니다.

**2. 세션 데이터가 이 대상으로 흐르는 것이 괜찮습니까?**

이것이 지정하려는 **최대** 분류 수준을 결정합니다. 높은 분류는 사용 시 세션 taint가 상승한다는 것을 의미하며, 이후 데이터가 흐를 수 있는 곳이 제한됩니다.

## 데이터 유형별 분류

| 데이터 유형                                | 권장 수준         | 이유                                     |
| ------------------------------------------ | ----------------- | ---------------------------------------- |
| 날씨, 공개 웹 페이지, 시간대               | **PUBLIC**        | 누구나 자유롭게 이용 가능               |
| 개인 메모, 북마크, 할 일 목록              | **INTERNAL**      | 비공개이지만 노출 시 피해가 적음        |
| 내부 위키, 팀 문서, 프로젝트 보드          | **INTERNAL**      | 조직 내부 정보                          |
| 이메일, 캘린더 이벤트, 연락처              | **CONFIDENTIAL**  | 이름, 일정, 관계 포함                   |
| CRM 데이터, 영업 파이프라인, 고객 기록     | **CONFIDENTIAL**  | 비즈니스 민감, 고객 데이터              |
| 재무 기록, 은행 계좌, 송장                 | **CONFIDENTIAL**  | 금전적 정보                             |
| 소스 코드 리포지토리 (비공개)              | **CONFIDENTIAL**  | 지적 재산                               |
| 의료 또는 건강 기록                        | **RESTRICTED**    | 법적 보호 대상 (HIPAA 등)              |
| 정부 ID 번호, SSN, 여권                    | **RESTRICTED**    | 신원 도용 위험                          |
| 법률 문서, NDA 하의 계약                   | **RESTRICTED**    | 법적 노출                               |
| 암호화 키, 자격 증명, 시크릿               | **RESTRICTED**    | 시스템 침해 위험                        |

## MCP 서버

`triggerfish.yaml`에 MCP 서버를 추가할 때, 분류는 두 가지를 결정합니다:

1. **세션 taint** -- 이 서버의 도구를 호출하면 세션이 이 수준으로 상승합니다
2. **Write-down 방지** -- 이 수준 이상으로 이미 taint된 세션은 이 서버에 데이터를 _전송_할 수 없습니다

```yaml
mcp_servers:
  # PUBLIC -- 개방 데이터, 민감하지 않음
  weather:
    command: npx
    args: ["-y", "@mcp/server-weather"]
    classification: PUBLIC

  # INTERNAL -- 자체 파일 시스템, 비공개이지만 시크릿은 아님
  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/you/docs"]
    classification: INTERNAL

  # CONFIDENTIAL -- 비공개 리포지토리, 고객 이슈에 접근
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  # RESTRICTED -- PII, 의료 기록, 법률 문서가 있는 데이터베이스
  postgres:
    command: npx
    args: ["-y", "@mcp/server-postgres"]
    env:
      DATABASE_URL: "keychain:prod-db-url"
    classification: RESTRICTED
```

::: warning 기본 거부 `classification`을 생략하면 서버는 **UNTRUSTED**로 등록되어 Gateway가 모든 도구 호출을 거부합니다. 수준을 명시적으로 선택해야 합니다. :::

### 일반적인 MCP 서버 분류

| MCP 서버                       | 권장 수준       | 근거                                          |
| ------------------------------ | --------------- | --------------------------------------------- |
| 파일 시스템 (공개 문서)        | PUBLIC          | 공개적으로 사용 가능한 파일만 노출            |
| 파일 시스템 (홈 디렉터리)      | INTERNAL        | 개인 파일, 시크릿 없음                        |
| 파일 시스템 (업무 프로젝트)    | CONFIDENTIAL    | 독점적 코드 또는 데이터 포함 가능             |
| GitHub (공개 리포지토리만)     | INTERNAL        | 코드는 공개지만 사용 패턴은 비공개            |
| GitHub (비공개 리포지토리)     | CONFIDENTIAL    | 독점적 소스 코드                              |
| Slack                          | CONFIDENTIAL    | 직장 대화, 잠재적으로 민감                    |
| 데이터베이스 (분석/보고)       | CONFIDENTIAL    | 집계된 비즈니스 데이터                        |
| 데이터베이스 (PII가 있는 프로덕션) | RESTRICTED   | 개인 식별 정보 포함                           |
| 날씨 / 시간 / 계산기           | PUBLIC          | 민감한 데이터 없음                            |
| 웹 검색                        | PUBLIC          | 공개적으로 사용 가능한 정보 반환              |
| 이메일                         | CONFIDENTIAL    | 이름, 대화, 첨부 파일                         |
| Google Drive                   | CONFIDENTIAL    | 문서에 민감한 비즈니스 데이터 포함 가능       |

## 채널

채널 분류는 **상한**을 결정합니다 -- 해당 채널에 전달할 수 있는 데이터의 최대 민감도입니다.

```yaml
channels:
  cli:
    classification: INTERNAL # 로컬 터미널 -- 내부 데이터에 안전
  telegram:
    classification: INTERNAL # 개인 봇 -- 소유자에게는 CLI와 동일
  webchat:
    classification: PUBLIC # 익명 방문자 -- 공개 데이터만
  email:
    classification: CONFIDENTIAL # 이메일은 비공개이지만 전달될 수 있음
```

::: tip 소유자 vs. 비소유자 **소유자**에게는 모든 채널이 동일한 신뢰 수준을 갖습니다 -- 어떤 앱을 사용하든 본인입니다. 채널 분류는 데이터 흐름을 제어하는 **비소유자 사용자**(WebChat 방문자, Slack 채널 멤버 등)에게 가장 중요합니다. :::

### 채널 분류 선택

| 질문                                                                     | 예라면...               | 아니라면...             |
| ------------------------------------------------------------------------ | ----------------------- | ----------------------- |
| 낯선 사람이 이 채널의 메시지를 볼 수 있습니까?                           | **PUBLIC**              | 계속 읽기               |
| 이 채널은 본인만 사용합니까?                                             | **INTERNAL** 이상       | 계속 읽기               |
| 메시지가 전달, 스크린샷, 제3자에 의해 로깅될 수 있습니까?                | **CONFIDENTIAL**로 제한 | **RESTRICTED** 가능     |
| 채널이 종단 간 암호화되어 있고 완전히 통제하고 있습니까?                  | **RESTRICTED** 가능     | **CONFIDENTIAL**로 제한 |

## 잘못 설정했을 때

**너무 낮은 경우 (예: CONFIDENTIAL 서버를 PUBLIC으로 표시):**

- 이 서버의 데이터가 세션 taint를 상승시키지 않습니다
- 세션이 분류된 데이터를 공개 채널로 흘릴 수 있습니다 -- **데이터 유출 위험**
- 이것이 위험한 방향입니다

**너무 높은 경우 (예: PUBLIC 서버를 CONFIDENTIAL로 표시):**

- 이 서버를 사용할 때 세션 taint가 불필요하게 상승합니다
- 이후 낮은 분류 채널로의 전송이 차단됩니다
- 불편하지만 **안전** -- 높은 쪽으로 오류를 범하십시오

::: danger 확신이 없으면 **더 높게 분류**하십시오. 서버가 실제로 반환하는 데이터를 검토한 후 나중에 낮출 수 있습니다. 과소 분류는 보안 위험이고, 과다 분류는 단지 불편함입니다. :::

## Taint 연쇄

실질적인 영향을 이해하면 현명한 선택에 도움이 됩니다. 세션에서 일어나는 일입니다:

```
1. 세션이 PUBLIC으로 시작
2. 날씨를 물어봄 (PUBLIC 서버)         → taint는 PUBLIC 유지
3. 메모 확인 (INTERNAL 파일 시스템)    → taint가 INTERNAL로 상승
4. GitHub 이슈 조회 (CONFIDENTIAL)     → taint가 CONFIDENTIAL로 상승
5. WebChat에 게시 시도 (PUBLIC 채널)   → 차단됨 (write-down 위반)
6. 세션 초기화                          → taint가 PUBLIC으로 돌아감
7. WebChat에 게시                      → 허용됨
```

CONFIDENTIAL 도구를 사용한 후 PUBLIC 채널을 자주 사용한다면 자주 초기화해야 합니다. 도구가 정말 CONFIDENTIAL이 필요한지, 또는 채널을 재분류할 수 있는지 고려하십시오.

## 파일 시스템 경로

에이전트가 혼합된 민감도를 가진 디렉터리에 접근할 때 유용한 개별 파일 시스템 경로를 분류할 수도 있습니다:

```yaml
filesystem:
  default: INTERNAL
  paths:
    "/home/you/public": PUBLIC
    "/home/you/work/clients": CONFIDENTIAL
    "/home/you/legal": RESTRICTED
```

## 검토 체크리스트

새 통합을 활성화하기 전에:

- [ ] 이 소스가 반환할 수 있는 최악의 데이터는 무엇입니까? 해당 수준으로 분류하십시오.
- [ ] 데이터 유형 표가 제안하는 것 이상의 분류입니까?
- [ ] 이것이 채널인 경우, 모든 가능한 수신자에게 분류가 적절합니까?
- [ ] 일반적인 워크플로우에서 taint 연쇄가 작동하는지 테스트했습니까?
- [ ] 확신이 없을 때 낮은 쪽보다 높은 쪽으로 분류했습니까?

## 관련 페이지

- [No Write-Down 규칙](/ko-KR/security/no-write-down) -- 고정된 데이터 흐름 규칙
- [구성](/ko-KR/guide/configuration) -- 전체 YAML 참조
- [MCP Gateway](/ko-KR/integrations/mcp-gateway) -- MCP 서버 보안 모델
