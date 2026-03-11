# 웹 검색 및 가져오기

Triggerfish는 두 가지 도구를 통해 에이전트에게 인터넷 접근을 제공합니다: 정보를 찾기 위한 `web_search`와 웹 페이지를 읽기 위한 `web_fetch`. 이들을 함께 사용하면 에이전트가 주제를 조사하고, 문서를 찾고, 현재 이벤트를 확인하고, 웹에서 데이터를 가져올 수 있습니다 -- 모두 다른 모든 도구와 동일한 정책 시행 하에.

## 도구

### `web_search`

웹을 검색합니다. 제목, URL, 스니펫을 반환합니다.

| 매개변수      | 유형   | 필수   | 설명                                                                                        |
| ------------- | ------ | ------ | ------------------------------------------------------------------------------------------- |
| `query`       | string | 예     | 검색 쿼리. 구체적으로 작성하십시오 -- 더 나은 결과를 위해 관련 키워드, 이름, 날짜를 포함.    |
| `max_results` | number | 아니오 | 반환할 최대 결과 수 (기본값: 5, 최대: 20).                                                  |

**예시 응답:**

```
Search results for "deno sqlite module":

1. @db/sqlite - Deno SQLite bindings
   https://jsr.io/@db/sqlite
   Fast SQLite3 bindings for Deno using FFI...

2. Deno SQLite Guide
   https://docs.deno.com/examples/sqlite
   How to use SQLite with Deno...
```

### `web_fetch`

URL에서 읽을 수 있는 콘텐츠를 가져오고 추출합니다. 기본적으로 Mozilla Readability를 사용하여 기사 텍스트를 반환합니다.

| 매개변수 | 유형   | 필수   | 설명                                                                             |
| -------- | ------ | ------ | -------------------------------------------------------------------------------- |
| `url`    | string | 예     | 가져올 URL. `web_search` 결과의 URL을 사용하십시오.                              |
| `mode`   | string | 아니오 | 추출 모드: `readability` (기본값, 기사 텍스트) 또는 `raw` (전체 HTML).           |

**추출 모드:**

- **`readability`** (기본값) -- 네비게이션, 광고, 상용구를 제거하고 주요 기사 콘텐츠를 추출합니다. 뉴스 기사, 블로그 게시물, 문서에 최적.
- **`raw`** -- 전체 HTML을 반환합니다. readability 추출이 너무 적은 콘텐츠를 반환할 때 사용합니다 (예: 단일 페이지 앱, 동적 콘텐츠).

## 에이전트 사용 방법

에이전트는 검색 후 가져오기 패턴을 따릅니다:

1. `web_search`를 사용하여 관련 URL을 찾습니다
2. `web_fetch`를 사용하여 가장 유망한 페이지를 읽습니다
3. 정보를 종합하고 출처를 인용합니다

웹 정보로 답변할 때 에이전트는 모든 채널(Telegram, Slack, CLI 등)에서 보이도록 소스 URL을 인라인으로 인용합니다.

## 구성

웹 검색에는 검색 제공자가 필요합니다. `triggerfish.yaml`에서 구성합니다:

```yaml
web:
  search:
    provider: brave # 검색 백엔드 (brave가 기본값)
    api_key: your-api-key # Brave Search API 키
```

| 키                    | 유형   | 설명                                    |
| --------------------- | ------ | --------------------------------------- |
| `web.search.provider` | string | 검색 백엔드. 현재 지원: `brave`.       |
| `web.search.api_key`  | string | 검색 제공자의 API 키.                  |

::: tip 검색 제공자가 구성되지 않으면 `web_search`는 검색을 사용할 수 없다는 오류 메시지를 반환합니다. `web_fetch`는 독립적으로 작동합니다 -- 검색 제공자가 필요하지 않습니다. :::

## 보안

- 가져온 모든 URL은 SSRF 방지를 거칩니다: DNS가 먼저 확인되고 하드코딩된 IP 거부 목록에 대해 확인됩니다. 비공개/예약 IP 범위는 항상 차단됩니다.
- 가져온 콘텐츠는 다른 모든 도구 응답처럼 분류되고 세션 taint에 기여합니다.
- 각 가져오기 전에 `PRE_TOOL_CALL` hook이 실행되고 이후 `POST_TOOL_RESPONSE`가 실행되므로 사용자 정의 정책 규칙이 에이전트가 접근하는 도메인을 제한할 수 있습니다.
