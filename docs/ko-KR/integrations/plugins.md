# Plugin SDK 및 샌드박스

Triggerfish 플러그인은 외부 시스템과 상호 작용하는 사용자 정의 코드로 에이전트를 확장합니다 -- CRM 쿼리, 데이터베이스 작업, API 통합, 다단계 워크플로우 -- 코드가 명시적으로 허용되지 않은 작업을 수행하는 것을 방지하는 이중 샌드박스 내에서 실행됩니다.

## 런타임 환경

플러그인은 Deno + Pyodide (WASM)에서 실행됩니다. Docker 없음. 컨테이너 없음. Triggerfish 설치 자체 외에 추가 사전 요구 사항이 없습니다.

- **TypeScript 플러그인**은 Deno 샌드박스에서 직접 실행됩니다
- **Python 플러그인**은 Pyodide (WebAssembly로 컴파일된 Python 인터프리터) 내에서 실행되며, 이는 다시 Deno 샌드박스 내에서 실행됩니다

<img src="/diagrams/plugin-sandbox.svg" alt="플러그인 샌드박스: Deno 샌드박스가 WASM 샌드박스를 감싸고 플러그인 코드가 가장 안쪽 레이어에서 실행됩니다" style="max-width: 100%;" />

이 이중 샌드박스 아키텍처는 플러그인에 악성 코드가 포함되어 있더라도 파일 시스템에 접근하거나, 선언되지 않은 네트워크 호출을 하거나, 호스트 시스템으로 탈출할 수 없음을 의미합니다.

## 플러그인이 할 수 있는 것

플러그인은 엄격한 경계 내에서 유연한 내부를 가집니다. 샌드박스 내에서 플러그인은:

- 대상 시스템에서 전체 CRUD 작업 수행 (사용자의 권한 사용)
- 복잡한 쿼리 및 데이터 변환 실행
- 다단계 워크플로우 오케스트레이션
- 데이터 처리 및 분석
- 호출 간 플러그인 상태 유지
- 선언된 모든 외부 API 엔드포인트 호출

## 플러그인이 할 수 없는 것

| 제약                                     | 적용 방식                                                           |
| ---------------------------------------- | ------------------------------------------------------------------- |
| 선언되지 않은 네트워크 엔드포인트 접근   | 샌드박스가 허용 목록에 없는 모든 네트워크 호출을 차단               |
| 분류 레이블 없이 데이터 출력             | SDK가 미분류 데이터를 거부                                          |
| 테인트 전파 없이 데이터 읽기             | SDK가 데이터 접근 시 세션을 자동 테인트                             |
| Triggerfish 외부에 데이터 저장           | 샌드박스 내에서 파일 시스템 접근 불가                               |
| 사이드 채널을 통한 데이터 유출           | 리소스 제한 적용, 원시 소켓 접근 불가                               |
| 시스템 자격 증명 사용                    | SDK가 `get_system_credential()` 차단; 사용자 자격 증명만 사용 가능  |

::: warning 보안 `sdk.get_system_credential()`은 설계상 **차단**됩니다. 플러그인은 항상 `sdk.get_user_credential()`을 통해 위임된 사용자 자격 증명을 사용해야 합니다. 이를 통해 에이전트가 사용자가 접근할 수 있는 것만 접근할 수 있습니다 -- 절대 그 이상은 아닙니다. :::

## Plugin SDK 메서드

SDK는 플러그인이 외부 시스템 및 Triggerfish 플랫폼과 상호 작용하기 위한 제어된 인터페이스를 제공합니다.

### 자격 증명 접근

```typescript
// 서비스에 대한 사용자의 위임 자격 증명 가져오기
const credential = await sdk.get_user_credential("salesforce");

// 사용자가 서비스에 연결했는지 확인
const connected = await sdk.has_user_connection("notion");
```

`sdk.get_user_credential(service)`는 명명된 서비스에 대한 사용자의 OAuth 토큰 또는 API 키를 검색합니다. 사용자가 서비스를 연결하지 않은 경우 호출은 `null`을 반환하며 플러그인은 이를 적절히 처리해야 합니다.

### 데이터 작업

```typescript
// 사용자의 권한으로 외부 시스템 쿼리
const results = await sdk.query_as_user("salesforce", {
  query: "SELECT Name, Amount FROM Opportunity WHERE StageName = 'Closed Won'",
});

// 에이전트에 데이터 출력 — 분류 레이블이 필수
sdk.emitData({
  classification: "CONFIDENTIAL",
  payload: results,
  source: "salesforce",
});
```

::: info `sdk.emitData()`에 대한 모든 호출은 `classification` 레이블이 필요합니다. 생략하면 SDK가 호출을 거부합니다. 이를 통해 플러그인에서 에이전트 컨텍스트로 흐르는 모든 데이터가 적절히 분류됩니다. :::

### 연결 확인

```typescript
// 사용자가 서비스에 대한 활성 연결이 있는지 확인
if (await sdk.has_user_connection("github")) {
  const repos = await sdk.query_as_user("github", {
    endpoint: "/user/repos",
  });
  sdk.emitData({
    classification: "INTERNAL",
    payload: repos,
    source: "github",
  });
}
```

## 플러그인 수명 주기

모든 플러그인은 활성화 전에 보안 검토를 보장하는 수명 주기를 따릅니다.

```
1. 플러그인 생성 (사용자, 에이전트 또는 타사에 의해)
       |
       v
2. Plugin SDK를 사용하여 플러그인 빌드
   - 필수 인터페이스 구현 필요
   - 엔드포인트 및 기능 선언 필요
   - 검증 통과 필요
       |
       v
3. 플러그인이 UNTRUSTED 상태로 진입
   - 에이전트가 사용할 수 없음
   - 소유자/관리자에게 알림: "분류 대기 중"
       |
       v
4. 소유자 (개인) 또는 관리자 (엔터프라이즈)가 검토:
   - 이 플러그인은 어떤 데이터에 접근하는가?
   - 어떤 작업을 수행할 수 있는가?
   - 분류 등급 할당
       |
       v
5. 할당된 분류에서 플러그인 활성
   - 에이전트가 정책 제약 내에서 호출 가능
   - 모든 호출이 정책 훅을 통과
```

::: tip 개인 티어에서는 사용자가 소유자입니다 -- 자체 플러그인을 검토하고 분류합니다. 엔터프라이즈 티어에서는 관리자가 플러그인 레지스트리를 관리하고 분류 등급을 할당합니다. :::

## 데이터베이스 연결

네이티브 데이터베이스 드라이버(psycopg2, mysqlclient 등)는 WASM 샌드박스 내에서 작동하지 않습니다. 플러그인은 HTTP 기반 API를 통해 데이터베이스에 연결합니다.

| 데이터베이스 | HTTP 기반 옵션                    |
| ------------ | --------------------------------- |
| PostgreSQL   | PostgREST, Supabase SDK, Neon API |
| MySQL        | PlanetScale API                   |
| MongoDB      | Atlas Data API                    |
| Snowflake    | REST API                          |
| BigQuery     | REST API                          |
| DynamoDB     | AWS SDK (HTTP)                    |

이것은 제한이 아닌 보안 이점입니다. 모든 데이터베이스 접근은 샌드박스가 적용하고 감사 시스템이 로깅할 수 있는 검사 가능하고 제어 가능한 HTTP 요청을 통해 흐릅니다.

## TypeScript 플러그인 작성

REST API를 쿼리하는 최소 TypeScript 플러그인:

```typescript
import type { PluginResult, PluginSdk } from "triggerfish/plugin";

export async function execute(sdk: PluginSdk): Promise<PluginResult> {
  // 사용자가 서비스에 연결했는지 확인
  if (!await sdk.has_user_connection("acme-api")) {
    return {
      success: false,
      error: "User has not connected Acme API. Please connect it first.",
    };
  }

  // 사용자의 자격 증명으로 쿼리
  const data = await sdk.query_as_user("acme-api", {
    endpoint: "/api/v1/tasks",
    method: "GET",
  });

  // 분류된 데이터를 에이전트에 출력
  sdk.emitData({
    classification: "INTERNAL",
    payload: data,
    source: "acme-api",
  });

  return { success: true };
}
```

## Python 플러그인 작성

최소 Python 플러그인:

```python
async def execute(sdk):
    # 연결 확인
    if not await sdk.has_user_connection("analytics-db"):
        return {"success": False, "error": "Analytics DB not connected"}

    # 사용자의 자격 증명으로 쿼리
    results = await sdk.query_as_user("analytics-db", {
        "endpoint": "/rest/v1/metrics",
        "method": "GET",
        "params": {"period": "7d"}
    })

    # 분류와 함께 출력
    sdk.emit_data({
        "classification": "CONFIDENTIAL",
        "payload": results,
        "source": "analytics-db"
    })

    return {"success": True}
```

Python 플러그인은 Pyodide WASM 런타임 내에서 실행됩니다. 표준 라이브러리 모듈은 사용 가능하지만 네이티브 C 확장은 사용할 수 없습니다. 외부 연결에는 HTTP 기반 API를 사용하십시오.

## 플러그인 보안 요약

- 플러그인은 엄격한 격리가 있는 이중 샌드박스(Deno + WASM)에서 실행됩니다
- 모든 네트워크 접근은 플러그인 매니페스트에 선언되어야 합니다
- 모든 출력 데이터에는 분류 레이블이 있어야 합니다
- 시스템 자격 증명은 차단됩니다 -- 사용자 위임 자격 증명만 사용 가능합니다
- 각 플러그인은 시스템에 `UNTRUSTED`로 진입하며 사용 전에 분류되어야 합니다
- 모든 플러그인 호출은 정책 훅을 통과하며 완전히 감사됩니다
