# 시크릿 관리

Triggerfish는 구성 파일에 자격 증명을 절대 저장하지 않습니다. 모든 시크릿 -- API 키, OAuth 토큰, 통합 자격 증명 -- 은 플랫폼 네이티브 보안 저장소에 저장됩니다: 개인 티어의 경우 OS 키체인, 엔터프라이즈 티어의 경우 vault 서비스. Plugin과 에이전트는 SDK를 통해 자격 증명과 상호 작용하며 엄격한 접근 통제가 시행됩니다.

## 저장소 백엔드

| 티어           | 백엔드            | 세부 사항                                                                                  |
| -------------- | ----------------- | ------------------------------------------------------------------------------------------ |
| **개인**       | OS 키체인         | macOS Keychain, Linux Secret Service (D-Bus를 통해), Windows Credential Manager            |
| **엔터프라이즈** | Vault 연동        | HashiCorp Vault, AWS Secrets Manager, Azure Key Vault 또는 기타 엔터프라이즈 vault 서비스  |

두 경우 모두 시크릿은 저장소 백엔드에 의해 저장 시 암호화됩니다. Triggerfish는 시크릿에 대한 자체 암호화를 구현하지 않으며 -- 목적에 맞게 구축되고 감사된 시크릿 저장 시스템에 위임합니다.

네이티브 키체인이 없는 플랫폼(Credential Manager가 없는 Windows, Docker 컨테이너)에서는 `~/.triggerfish/secrets.json`의 암호화된 JSON 파일로 폴백합니다. 항목은 `~/.triggerfish/secrets.key`(권한: `0600`)에 저장된 머신 바인딩된 256비트 키를 사용하는 AES-256-GCM으로 암호화됩니다. 각 항목은 모든 쓰기 시 새로운 무작위 12바이트 IV를 사용합니다. 레거시 평문 시크릿 파일은 첫 로드 시 자동으로 암호화된 형식으로 마이그레이션됩니다.

::: tip 개인 티어는 시크릿에 대해 제로 구성을 요구합니다. 설정 중(`triggerfish dive`) 통합을 연결하면 자격 증명이 자동으로 OS 키체인에 저장됩니다. 운영 체제가 이미 제공하는 것 이상으로 설치하거나 구성할 필요가 없습니다. :::

## 구성에서의 시크릿 참조

Triggerfish는 `triggerfish.yaml`에서 `secret:` 참조를 지원합니다. 자격 증명을 평문으로 저장하는 대신 이름으로 참조하면 시작 시 OS 키체인에서 확인됩니다.

```yaml
models:
  providers:
    anthropic:
      apiKey: "secret:provider:anthropic:apiKey"
    openai:
      apiKey: "secret:provider:openai:apiKey"

channels:
  telegram:
    botToken: "secret:channel:telegram:botToken"
```

리졸버는 구성 파일의 깊이 우선 탐색을 수행합니다. `secret:`으로 시작하는 모든 문자열 값은 해당 키체인 항목으로 대체됩니다. 참조된 시크릿을 찾을 수 없으면 명확한 오류 메시지와 함께 시작이 즉시 실패합니다.

### 기존 시크릿 마이그레이션

이전 버전의 구성 파일에 평문 자격 증명이 있는 경우 마이그레이션 명령이 자동으로 키체인으로 이동합니다:

```bash
triggerfish config migrate-secrets
```

이 명령은:

1. `triggerfish.yaml`에서 평문 자격 증명 값을 스캔합니다
2. 각각을 OS 키체인에 저장합니다
3. 평문 값을 `secret:` 참조로 교체합니다
4. 원본 파일의 백업을 생성합니다

::: warning 마이그레이션 후 백업 파일을 삭제하기 전에 에이전트가 올바르게 시작되는지 확인하십시오. 마이그레이션은 백업 없이는 되돌릴 수 없습니다. :::

## 위임된 자격 증명 아키텍처

Triggerfish의 핵심 보안 원칙은 데이터 쿼리가 시스템 자격 증명이 아닌 **사용자의** 자격 증명으로 실행된다는 것입니다. 이는 에이전트가 소스 시스템의 권한 모델을 상속하도록 보장합니다 -- 사용자는 직접 접근할 수 있는 데이터에만 접근할 수 있습니다.

<img src="/diagrams/delegated-credentials.svg" alt="위임된 자격 증명 아키텍처: 사용자가 OAuth 동의를 부여하고, 에이전트가 사용자의 토큰으로 쿼리하며, 소스 시스템이 권한을 시행합니다" style="max-width: 100%;" />

이 아키텍처는 다음을 의미합니다:

- **과도한 권한 부여 없음** -- 에이전트가 사용자가 직접 접근할 수 없는 데이터에 접근할 수 없습니다
- **시스템 서비스 계정 없음** -- 손상될 수 있는 전능한 자격 증명이 없습니다
- **소스 시스템 시행** -- 소스 시스템(Salesforce, Jira, GitHub 등)이 모든 쿼리에서 자체 권한을 시행합니다

::: warning 보안 기존 AI 에이전트 플랫폼은 종종 모든 사용자를 대신하여 통합에 접근하기 위해 단일 시스템 서비스 계정을 사용합니다. 이는 에이전트가 통합의 모든 데이터에 접근할 수 있고 각 사용자에게 무엇을 보여줄지 LLM이 결정하는 것에 의존합니다. Triggerfish는 이 위험을 완전히 제거합니다: 쿼리는 사용자 자신의 위임된 OAuth 토큰으로 실행됩니다. :::

## Plugin SDK 시행

Plugin은 Triggerfish SDK를 통해서만 자격 증명과 상호 작용합니다. SDK는 권한 인식 메서드를 제공하고 시스템 수준 자격 증명에 접근하려는 모든 시도를 차단합니다.

### 허용: 사용자 자격 증명 접근

```python
def get_user_opportunities(sdk, params):
    # SDK가 보안 저장소에서 사용자의 위임된 토큰을 검색합니다
    # 사용자가 Salesforce를 연결하지 않은 경우 유용한 오류를 반환합니다
    user_token = sdk.get_user_credential("salesforce")

    # 쿼리가 사용자의 권한으로 실행됩니다
    # 소스 시스템이 접근 제어를 시행합니다
    return sdk.query_as_user(
        integration="salesforce",
        query="SELECT Id, Name, Amount FROM Opportunity",
        user_id=sdk.current_user_id
    )
```

### 차단: 시스템 자격 증명 접근

```python
def get_all_opportunities(sdk, params):
    # PermissionError 발생 -- SDK에 의해 차단됨
    token = sdk.get_system_credential("SALESFORCE_TOKEN")
    return query_salesforce(token, "SELECT * FROM Opportunity")
```

::: danger `sdk.get_system_credential()`은 항상 차단됩니다. 이를 활성화하는 구성, 관리자 재정의, escape hatch가 없습니다. 이것은 no write-down 규칙과 같은 고정 보안 규칙입니다. :::

## LLM 호출 가능 시크릿 도구

에이전트는 세 가지 도구를 통해 시크릿을 관리할 수 있습니다. 중요한 점은 LLM이 실제 시크릿 값을 절대 보지 못한다는 것입니다 -- 입력과 저장은 대역 외에서 발생합니다.

### `secret_save`

시크릿 값을 안전하게 입력하도록 프롬프트합니다:

- **CLI**: 터미널이 숨김 입력 모드로 전환됩니다(문자가 에코되지 않음)
- **Tidepool**: 웹 인터페이스에 보안 입력 팝업이 나타납니다

LLM은 시크릿 저장을 요청하지만 실제 값은 사용자가 보안 프롬프트를 통해 입력합니다. 값은 키체인에 직접 저장되며 -- LLM 컨텍스트를 통과하지 않습니다.

### `secret_list`

저장된 모든 시크릿의 이름을 나열합니다. 값은 절대 노출하지 않습니다.

### `secret_delete`

이름으로 키체인에서 시크릿을 삭제합니다.

### 도구 인수 대체

<div v-pre>

에이전트가 시크릿이 필요한 도구를 사용할 때(예: MCP 서버 환경 변수에 API 키 설정) 도구 인수에서 <span v-pre>`{{secret:name}}`</span> 구문을 사용합니다:

```
tool_call: set_env_var
arguments: { "key": "API_TOKEN", "value": "{{secret:my-api-token}}" }
```

런타임은 도구가 실행되기 전에 **LLM 계층 아래에서** <span v-pre>`{{secret:name}}`</span> 참조를 확인합니다. 확인된 값은 대화 기록이나 로그에 절대 나타나지 않습니다.

</div>

::: warning 보안 <code v-pre>{{secret:name}}</code> 대체는 LLM이 아닌 코드에 의해 시행됩니다. LLM이 확인된 값을 로깅하거나 반환하려 해도 정책 계층이 `PRE_OUTPUT` hook에서 시도를 포착합니다. :::

### SDK 권한 메서드

| 메서드                                  | 동작                                                                                                                                            |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `sdk.get_user_credential(integration)`  | 지정된 통합에 대한 사용자의 위임된 OAuth 토큰을 반환합니다. 사용자가 통합을 연결하지 않은 경우 지시 사항과 함께 오류를 반환합니다.               |
| `sdk.query_as_user(integration, query)` | 사용자의 위임된 자격 증명을 사용하여 통합에 대한 쿼리를 실행합니다. 소스 시스템이 자체 권한을 시행합니다.                                        |
| `sdk.get_system_credential(name)`       | **항상 차단됩니다.** `PermissionError`를 발생시킵니다. 보안 이벤트로 로깅됩니다.                                                                |
| `sdk.has_user_connection(integration)`  | 사용자가 지정된 통합을 연결했으면 `true`, 아니면 `false`를 반환합니다. 자격 증명 데이터를 노출하지 않습니다.                                     |

## 권한 인식 데이터 접근

위임된 자격 증명 아키텍처는 분류 시스템과 함께 작동합니다. 사용자가 소스 시스템에서 데이터에 접근할 권한이 있더라도 Triggerfish의 분류 규칙이 해당 데이터가 검색된 후 흐를 수 있는 곳을 관리합니다.

<img src="/diagrams/secret-resolution-flow.svg" alt="시크릿 확인 흐름: 구성 파일 참조가 LLM 계층 아래에서 OS 키체인으로부터 확인됩니다" style="max-width: 100%;" />

**예시:**

```
사용자: "Acme 거래를 요약하고 아내에게 보내줘"

단계 1: 권한 확인
  --> 사용자의 Salesforce 토큰 사용
  --> Salesforce가 Acme 기회를 반환 (사용자에게 접근 권한 있음)

단계 2: 분류
  --> Salesforce 데이터가 CONFIDENTIAL로 분류됨
  --> 세션 taint가 CONFIDENTIAL로 상승

단계 3: 출력 확인
  --> 아내 = EXTERNAL 수신자
  --> CONFIDENTIAL --> EXTERNAL: 차단

결과: 데이터 검색됨 (사용자에게 권한 있음), 그러나 전송 불가
      (분류 규칙이 유출을 방지)
```

사용자는 Salesforce에서 Acme 거래에 합법적으로 접근할 수 있습니다. Triggerfish는 이를 존중하고 데이터를 검색합니다. 그러나 분류 시스템은 해당 데이터가 외부 수신자에게 흐르는 것을 방지합니다. 데이터에 대한 접근 권한은 공유 권한과 별개입니다.

## 시크릿 접근 로깅

모든 자격 증명 접근은 `SECRET_ACCESS` 시행 hook을 통해 로깅됩니다:

```json
{
  "timestamp": "2025-01-29T10:23:45Z",
  "hook_type": "SECRET_ACCESS",
  "session_id": "sess_456",
  "decision": "ALLOW",
  "details": {
    "method": "get_user_credential",
    "integration": "salesforce",
    "user_id": "user_456",
    "credential_type": "oauth_delegated"
  }
}
```

차단된 시도도 로깅됩니다:

```json
{
  "timestamp": "2025-01-29T10:23:46Z",
  "hook_type": "SECRET_ACCESS",
  "session_id": "sess_456",
  "decision": "BLOCK",
  "details": {
    "method": "get_system_credential",
    "requested_name": "SALESFORCE_TOKEN",
    "reason": "System credential access is prohibited",
    "plugin_id": "plugin_789"
  }
}
```

::: info 차단된 자격 증명 접근 시도는 상승된 알림 수준으로 로깅됩니다. 엔터프라이즈 배포에서는 이러한 이벤트가 보안 팀에 알림을 트리거할 수 있습니다. :::

## 엔터프라이즈 Vault 연동

엔터프라이즈 배포는 자격 증명 관리를 위해 Triggerfish를 중앙 집중식 vault 서비스에 연결할 수 있습니다:

| Vault 서비스        | 연동                                 |
| ------------------- | ------------------------------------ |
| HashiCorp Vault     | 네이티브 API 연동                    |
| AWS Secrets Manager | AWS SDK 연동                         |
| Azure Key Vault     | Azure SDK 연동                       |
| 커스텀 vault        | 플러그형 `SecretProvider` 인터페이스 |

엔터프라이즈 vault 연동은 다음을 제공합니다:

- **중앙 집중식 순환** -- 자격 증명이 vault에서 순환되고 Triggerfish가 자동으로 반영합니다
- **접근 정책** -- vault 수준 정책이 어떤 에이전트와 사용자가 어떤 자격 증명에 접근할 수 있는지 제어합니다
- **감사 통합** -- Triggerfish와 vault의 자격 증명 접근 로그를 상관시킬 수 있습니다

## 구성 파일에 절대 저장되지 않는 것

다음은 `triggerfish.yaml` 또는 다른 구성 파일에 평문 값으로 절대 나타나지 않습니다. OS 키체인에 저장되고 `secret:` 구문으로 참조되거나 `secret_save` 도구를 통해 관리됩니다:

- LLM 제공자의 API 키
- 통합의 OAuth 토큰
- 데이터베이스 자격 증명
- Webhook 시크릿
- 암호화 키
- 페어링 코드 (임시, 메모리 내에서만)

::: danger Triggerfish 구성 파일에서 평문 자격 증명(`secret:` 참조가 아닌 값)을 발견하면 문제가 발생한 것입니다. `triggerfish config migrate-secrets`를 실행하여 키체인으로 이동하십시오. 평문으로 발견된 자격 증명은 즉시 순환해야 합니다. :::

## 관련 페이지

- [보안 우선 설계](./) -- 보안 아키텍처 개요
- [No Write-Down 규칙](./no-write-down) -- 분류 통제가 자격 증명 격리를 보완하는 방법
- [신원 및 인증](./identity) -- 사용자 신원이 위임된 자격 증명 접근에 어떻게 반영되는지
- [감사 및 컴플라이언스](./audit-logging) -- 자격 증명 접근 이벤트가 기록되는 방법
