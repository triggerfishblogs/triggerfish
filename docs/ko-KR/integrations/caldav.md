# CalDAV 통합

Triggerfish 에이전트를 CalDAV 호환 캘린더 서버에 연결합니다. 이를 통해 iCloud, Fastmail, Nextcloud, Radicale 및 자체 호스팅 CalDAV 서버를 포함하여 CalDAV 표준을 지원하는 제공자 전반에서 캘린더 작업이 가능합니다.

## 지원되는 제공자

| 제공자     | CalDAV URL                                      | 비고                            |
| ---------- | ----------------------------------------------- | ------------------------------- |
| iCloud     | `https://caldav.icloud.com`                     | 앱 전용 비밀번호 필요           |
| Fastmail   | `https://caldav.fastmail.com/dav/calendars`     | 표준 CalDAV                     |
| Nextcloud  | `https://your-server.com/remote.php/dav`        | 자체 호스팅                     |
| Radicale   | `https://your-server.com`                       | 경량 자체 호스팅                |
| Baikal     | `https://your-server.com/dav.php`               | 자체 호스팅                     |

::: info Google Calendar의 경우 대신 [Google Workspace](/ko-KR/integrations/google-workspace) 통합을 사용하십시오. 이는 OAuth2를 사용하는 네이티브 Google API를 사용합니다. CalDAV는 Google 이외의 캘린더 제공자용입니다. :::

## 설정

### 1단계: CalDAV 자격 증명 획득

캘린더 제공자로부터 세 가지 정보가 필요합니다:

- **CalDAV URL** -- CalDAV 서버의 기본 URL
- **사용자 이름** -- 계정 사용자 이름 또는 이메일
- **비밀번호** -- 계정 비밀번호 또는 앱 전용 비밀번호

::: warning 앱 전용 비밀번호 대부분의 제공자는 메인 계정 비밀번호 대신 앱 전용 비밀번호를 요구합니다. 생성 방법은 제공자의 문서를 확인하십시오. :::

### 2단계: Triggerfish 구성

```yaml
integrations:
  caldav:
    url: "https://caldav.icloud.com"
    username: "you@icloud.com"
    # password stored in OS keychain
    classification: CONFIDENTIAL
```

| 옵션             | 유형   | 필수   | 설명                                                |
| ---------------- | ------ | ------ | --------------------------------------------------- |
| `url`            | string | 예     | CalDAV 서버 기본 URL                                |
| `username`       | string | 예     | 계정 사용자 이름 또는 이메일                        |
| `password`       | string | 예     | 계정 비밀번호 (OS 키체인에 저장)                    |
| `classification` | string | 아니오 | 분류 수준 (기본값: `CONFIDENTIAL`)                  |

### 3단계: 캘린더 검색

첫 번째 연결 시 에이전트가 CalDAV 검색을 실행하여 사용 가능한 모든 캘린더를 찾습니다. 검색된 캘린더는 로컬에 캐시됩니다.

```bash
triggerfish connect caldav
```

## 사용 가능한 도구

| 도구                | 설명                                                 |
| ------------------- | ---------------------------------------------------- |
| `caldav_list`       | 계정의 모든 캘린더 나열                              |
| `caldav_events`     | 하나 또는 모든 캘린더에서 날짜 범위의 이벤트 가져오기 |
| `caldav_create`     | 새 캘린더 이벤트 생성                                |
| `caldav_update`     | 기존 이벤트 업데이트                                 |
| `caldav_delete`     | 이벤트 삭제                                          |
| `caldav_search`     | 텍스트 쿼리로 이벤트 검색                            |
| `caldav_freebusy`   | 시간 범위의 여유/바쁨 상태 확인                      |

## 분류

캘린더 데이터는 이름, 일정, 위치, 회의 세부 사항을 포함하므로 기본적으로 `CONFIDENTIAL`입니다. CalDAV 도구에 접근하면 세션 taint가 구성된 분류 수준으로 상승합니다.

## 인증

CalDAV는 TLS를 통한 HTTP Basic Auth를 사용합니다. 자격 증명은 OS 키체인에 저장되고 LLM 컨텍스트 아래의 HTTP 계층에서 주입됩니다 -- 에이전트는 원시 비밀번호를 보지 못합니다.

## 관련 페이지

- [Google Workspace](/ko-KR/integrations/google-workspace) -- Google Calendar용 (네이티브 API 사용)
- [Cron과 트리거](/ko-KR/features/cron-and-triggers) -- 캘린더 기반 에이전트 동작 예약
- [분류 가이드](/ko-KR/guide/classification-guide) -- 적절한 분류 수준 선택
