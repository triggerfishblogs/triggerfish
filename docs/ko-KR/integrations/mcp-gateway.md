# MCP Gateway

> 모든 MCP 서버를 사용하십시오. 저희가 경계를 보호합니다.

Model Context Protocol (MCP)은 에이전트-도구 통신을 위한 새로운 표준입니다.
Triggerfish는 분류 제어, 도구 수준 권한, 테인트 추적 및 전체 감사 로깅을
적용하면서 MCP 호환 서버에 연결할 수 있는 보안 MCP Gateway를 제공합니다.

MCP 서버는 사용자가 가져옵니다. Triggerfish는 경계를 넘는 모든 요청과
응답을 보호합니다.

## 작동 방식

MCP Gateway는 에이전트와 모든 MCP 서버 사이에 위치합니다. 모든 도구
호출은 외부 서버에 도달하기 전에 정책 적용 레이어를 통과하며, 모든 응답은
에이전트 컨텍스트에 진입하기 전에 분류됩니다.

<img src="/diagrams/mcp-gateway-flow.svg" alt="MCP Gateway 흐름: 에이전트 → MCP Gateway → 정책 레이어 → MCP 서버, BLOCKED로의 거부 경로 포함" style="max-width: 100%;" />

Gateway는 다섯 가지 핵심 기능을 제공합니다:

1. **서버 인증 및 분류** -- MCP 서버는 사용 전에 검토 및 분류되어야 합니다
2. **도구 수준 권한 적용** -- 개별 도구를 허용, 제한 또는 차단할 수 있습니다
3. **요청/응답 테인트 추적** -- 서버 분류에 따라 세션 테인트가 에스컬레이션됩니다
4. **스키마 검증** -- 모든 요청 및 응답이 선언된 스키마에 대해 검증됩니다
5. **감사 로깅** -- 모든 도구 호출, 결정 및 테인트 변경이 기록됩니다

## MCP 서버 상태

모든 MCP 서버는 기본적으로 `UNTRUSTED`입니다. 에이전트가 호출하기 전에
명시적으로 분류되어야 합니다.

| 상태         | 설명                                                               | 에이전트 호출 가능? |
| ------------ | ------------------------------------------------------------------ | :-----------------: |
| `UNTRUSTED`  | 새 서버의 기본값. 검토 대기 중.                                    |        아니오       |
| `CLASSIFIED` | 검토되고 도구별 권한과 함께 분류 등급이 할당됨.                    | 예 (정책 범위 내)   |
| `BLOCKED`    | 관리자에 의해 명시적으로 금지됨.                                    |        아니오       |

<img src="/diagrams/state-machine.svg" alt="MCP 서버 상태 머신: UNTRUSTED → CLASSIFIED 또는 BLOCKED" style="max-width: 100%;" />

::: warning 보안 `UNTRUSTED` MCP 서버는 어떤 상황에서도 에이전트가 호출할
수 없습니다. LLM은 미분류 서버를 사용하도록 시스템을 요청, 설득 또는
속일 수 없습니다. 분류는 LLM 결정이 아닌 코드 수준의 게이트입니다. :::

## 구성

MCP 서버는 `triggerfish.yaml`에서 서버 ID를 키로 하는 맵으로 구성됩니다.
각 서버는 로컬 서브프로세스(stdio 전송) 또는 원격 엔드포인트(SSE 전송)를
사용합니다.

### 로컬 서버 (Stdio)

로컬 서버는 서브프로세스로 생성됩니다. Triggerfish는 stdin/stdout을 통해
통신합니다.

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/you/docs"]
    classification: INTERNAL

  weather:
    command: npx
    args: ["-y", "@mcp/server-weather"]
    classification: PUBLIC
```

### 원격 서버 (SSE)

원격 서버는 다른 곳에서 실행되며 HTTP Server-Sent Events를 통해
접근됩니다.

```yaml
mcp_servers:
  remote_api:
    url: "https://mcp.example.com/sse"
    classification: CONFIDENTIAL
```

### 구성 키

| 키               | 타입     | 필수        | 설명                                                                          |
| ---------------- | -------- | ----------- | ----------------------------------------------------------------------------- |
| `command`        | string   | 예 (stdio)  | 생성할 바이너리 (예: `npx`, `deno`, `node`)                                  |
| `args`           | string[] | 아니오      | 명령에 전달할 인수                                                            |
| `env`            | map      | 아니오      | 서브프로세스를 위한 환경 변수                                                 |
| `url`            | string   | 예 (SSE)    | 원격 서버용 HTTP 엔드포인트                                                   |
| `classification` | string   | **예**      | 데이터 민감도 등급: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL` 또는 `RESTRICTED`    |
| `enabled`        | boolean  | 아니오      | 기본값: `true`. 구성을 제거하지 않고 건너뛰려면 `false`로 설정.              |

각 서버에는 `command` (로컬) 또는 `url` (원격)이 있어야 합니다. 둘 다
없는 서버는 건너뜁니다.

### 지연 연결

MCP 서버는 시작 후 백그라운드에서 연결됩니다. 에이전트를 사용하기 전에
모든 서버가 준비될 때까지 기다릴 필요가 없습니다.

- 서버는 지수 백오프로 재시도합니다: 2초 → 4초 → 8초 → 최대 30초
- 새 서버는 연결되면 에이전트에서 사용 가능합니다 -- 세션 재시작 불필요
- 모든 재시도 후 서버 연결에 실패하면 `failed` 상태로 들어가며 다음 데몬
  재시작 시 재시도할 수 있습니다

CLI 및 Tidepool 인터페이스는 실시간 MCP 연결 상태를 표시합니다. 자세한
내용은 [CLI 채널](/ko-KR/channels/cli#mcp-서버-상태)을 참조하십시오.

### 서버 비활성화

구성을 제거하지 않고 MCP 서버를 일시적으로 비활성화하려면:

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    classification: CONFIDENTIAL
    enabled: false # 시작 시 건너뜀
```

### 환경 변수 및 시크릿

`keychain:` 접두사가 붙은 환경 변수 값은 시작 시 OS 키체인에서
해석됩니다:

```yaml
env:
  API_KEY: "keychain:my-secret-name" # OS 키체인에서 해석
  PLAIN_VAR: "literal-value" # 그대로 전달
```

호스트 환경에서 `PATH`만 상속됩니다 (`npx`, `node`, `deno` 등이 올바르게
해석되도록). 다른 호스트 환경 변수는 MCP 서버 서브프로세스로 유출되지
않습니다.

::: tip `triggerfish config set-secret <name> <value>`로 시크릿을
저장하십시오. 그런 다음 MCP 서버 환경 구성에서 `keychain:<name>`으로
참조하십시오. :::

### 도구 네이밍

MCP 서버의 도구는 내장 도구와의 충돌을 방지하기 위해
`mcp_<serverId>_<toolName>`으로 네임스페이스됩니다. 예를 들어 `github`이라는
서버가 `list_repos`라는 도구를 노출하면 에이전트는 이를
`mcp_github_list_repos`로 봅니다.

### 분류 및 기본 거부

`classification`을 생략하면 서버가 **UNTRUSTED**로 등록되며 Gateway가
모든 도구 호출을 거부합니다. 분류 등급을 명시적으로 선택해야 합니다.
올바른 등급 선택에 대한 도움은
[분류 가이드](/guide/classification-guide)를 참조하십시오.

## 도구 호출 흐름

에이전트가 MCP 도구 호출을 요청하면 Gateway는 요청을 전달하기 전에
결정론적인 일련의 검사를 실행합니다.

### 1. 사전 비행 검사

모든 검사는 결정론적입니다 -- LLM 호출 없음, 무작위성 없음.

| 검사                                           | 실패 결과                         |
| ---------------------------------------------- | --------------------------------- |
| 서버 상태가 `CLASSIFIED`인가?                  | 차단: "서버 미승인"               |
| 이 서버에 도구가 허용되는가?                   | 차단: "도구 비허용"               |
| 사용자가 필요한 권한을 가지고 있는가?           | 차단: "권한 거부"                 |
| 세션 테인트가 서버 분류와 호환되는가?          | 차단: "하향 기록 위반"            |
| 스키마 검증을 통과하는가?                      | 차단: "잘못된 매개변수"           |

::: info 세션 테인트가 서버 분류보다 높으면 하향 기록을 방지하기 위해
호출이 차단됩니다. `CONFIDENTIAL`로 테인트된 세션은 `PUBLIC` MCP 서버에
데이터를 보낼 수 없습니다. :::

### 2. 실행

모든 사전 비행 검사를 통과하면 Gateway가 요청을 MCP 서버로 전달합니다.

### 3. 응답 처리

MCP 서버가 응답을 반환하면:

- 선언된 스키마에 대해 응답을 검증합니다
- 서버의 분류 등급으로 응답 데이터를 분류합니다
- 세션 테인트를 업데이트합니다: `taint = max(current_taint, server_classification)`
- 데이터 출처를 추적하는 계보 레코드를 생성합니다

### 4. 감사

모든 도구 호출은 서버 신원, 도구 이름, 사용자 신원, 정책 결정, 테인트
변경 및 타임스탬프와 함께 로깅됩니다.

## 응답 테인트 규칙

MCP 서버 응답은 서버의 분류 등급을 상속합니다. 세션 테인트는
에스컬레이션만 가능합니다.

| 서버 분류       | 응답 테인트      | 세션 영향                                    |
| --------------- | ---------------- | -------------------------------------------- |
| `PUBLIC`        | `PUBLIC`         | 테인트 변경 없음                             |
| `INTERNAL`      | `INTERNAL`       | 테인트가 최소 `INTERNAL`로 에스컬레이션      |
| `CONFIDENTIAL`  | `CONFIDENTIAL`   | 테인트가 최소 `CONFIDENTIAL`로 에스컬레이션  |
| `RESTRICTED`    | `RESTRICTED`     | 테인트가 `RESTRICTED`로 에스컬레이션         |

세션이 특정 등급으로 테인트되면 세션의 나머지 기간 동안 해당 등급 이상으로
유지됩니다. 테인트를 줄이려면 전체 세션 리셋(대화 기록 삭제)이 필요합니다.

## 사용자 인증 패스스루

사용자 수준 인증을 지원하는 MCP 서버의 경우 Gateway는 시스템 자격 증명
대신 사용자의 위임 자격 증명을 전달합니다.

도구가 `requires_user_auth: true`로 구성된 경우:

1. Gateway는 사용자가 이 MCP 서버를 연결했는지 확인합니다
2. 보안 자격 증명 저장소에서 사용자의 위임 자격 증명을 검색합니다
3. MCP 요청 헤더에 사용자 인증을 추가합니다
4. MCP 서버가 사용자 수준 권한을 적용합니다

결과: MCP 서버는 시스템 신원이 아닌 **사용자의 신원**을 봅니다. 권한
상속이 MCP 경계를 통해 작동합니다 -- 에이전트는 사용자가 접근할 수 있는
것만 접근할 수 있습니다.

::: tip 사용자 인증 패스스루는 접근 제어를 관리하는 모든 MCP 서버에
선호되는 패턴입니다. 이는 에이전트가 무제한 시스템 접근이 아닌 사용자의
권한을 상속함을 의미합니다. :::

## 스키마 검증

Gateway는 전달하기 전에 선언된 스키마에 대해 모든 MCP 요청 및 응답을
검증합니다:

```typescript
// 요청 검증 (간소화)
function validateMcpRequest(
  serverConfig: McpServerConfig,
  toolName: string,
  params: Record<string, unknown>,
): Result<void, McpError> {
  const toolSchema = serverConfig.getToolSchema(toolName);

  if (!toolSchema) {
    return err(new McpError("Unknown tool"));
  }

  // JSON 스키마에 대해 매개변수 검증
  if (!validateJsonSchema(params, toolSchema.inputSchema)) {
    return err(new McpError("Invalid parameters"));
  }

  // 문자열 매개변수에서 인젝션 패턴 확인
  for (const [, value] of Object.entries(params)) {
    if (typeof value === "string" && containsInjectionPattern(value)) {
      return err(new McpError("Potential injection detected"));
    }
  }

  return ok(undefined);
}
```

스키마 검증은 잘못된 형식의 요청이 외부 서버에 도달하기 전에 포착하고
문자열 매개변수에서 잠재적인 인젝션 패턴을 표시합니다.

## 엔터프라이즈 제어

엔터프라이즈 배포에는 MCP 서버 관리를 위한 추가 제어가 있습니다:

- **관리자 관리 서버 레지스트리** -- 관리자 승인된 MCP 서버만 분류할 수
  있습니다
- **부서별 도구 권한** -- 팀마다 다른 도구 접근 권한을 가질 수 있습니다
- **컴플라이언스 로깅** -- 모든 MCP 상호 작용을 컴플라이언스
  대시보드에서 사용 가능
- **속도 제한** -- 서버별 및 도구별 속도 제한
- **서버 상태 모니터링** -- Gateway가 서버 가용성 및 응답 시간을 추적
