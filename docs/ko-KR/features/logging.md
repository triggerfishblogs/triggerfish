# 구조화된 로깅

Triggerfish는 심각도 수준, 파일 로테이션, 구성 가능한 출력을 가진 구조화된 로깅을 사용합니다. Gateway, 오케스트레이터, MCP 클라이언트, LLM 제공자, 정책 엔진 등 모든 구성 요소가 통합 로거를 통해 로깅합니다. 이는 이벤트가 어디서 발생하든 일관된 단일 로그 스트림을 제공합니다.

## 로그 수준

`logging.level` 설정은 캡처되는 세부 정보의 양을 제어합니다:

| 구성 값            | 심각도             | 로깅되는 내용                                          |
| ------------------ | ------------------ | ------------------------------------------------------ |
| `quiet`            | ERROR만            | 크래시 및 치명적 실패                                  |
| `normal` (기본값)  | INFO 이상          | 시작, 연결, 중요한 이벤트                              |
| `verbose`          | DEBUG 이상         | 도구 호출, 정책 결정, 제공자 요청                      |
| `debug`            | TRACE (모든 것)    | 전체 요청/응답 페이로드, 토큰 수준 스트리밍            |

각 수준은 그 위의 모든 것을 포함합니다. `verbose`로 설정하면 DEBUG, INFO, ERROR를 받습니다. `quiet`로 설정하면 오류를 제외한 모든 것이 억제됩니다.

## 구성

`triggerfish.yaml`에서 로그 수준을 설정합니다:

```yaml
logging:
  level: normal
```

이것이 유일한 필수 구성입니다. 기본값은 대부분의 사용자에게 적합합니다 -- `normal`은 에이전트가 무엇을 하고 있는지 이해하기에 충분한 양을 캡처하면서 로그를 노이즈로 범람시키지 않습니다.

## 로그 출력

로그는 두 대상에 동시에 기록됩니다:

- **stderr** -- systemd 서비스로 실행할 때 `journalctl` 캡처 또는 개발 중 직접 터미널 출력
- **파일** -- `~/.triggerfish/logs/triggerfish.log`

각 로그 라인은 구조화된 형식을 따릅니다:

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] WebSocket client connected
[2026-02-17T14:30:45.456Z] [DEBUG] [orch] Tool call: web_search {query: "deno sqlite"}
[2026-02-17T14:30:46.789Z] [ERROR] [provider] Anthropic API returned 529: overloaded
```

### 구성 요소 태그

대괄호 안의 태그는 로그 항목을 발생시킨 하위 시스템을 식별합니다:

| 태그          | 구성 요소                            |
| ------------- | ------------------------------------ |
| `[gateway]`   | WebSocket 제어 평면                  |
| `[orch]`      | 에이전트 오케스트레이터 및 도구 디스패치 |
| `[mcp]`       | MCP 클라이언트 및 Gateway 프록시     |
| `[provider]`  | LLM 제공자 호출                      |
| `[policy]`    | 정책 엔진 및 hook 평가               |
| `[session]`   | 세션 수명 주기 및 taint 변경         |
| `[channel]`   | 채널 어댑터 (Telegram, Slack 등)     |
| `[scheduler]` | Cron 작업, 트리거, webhook           |
| `[memory]`    | 메모리 저장소 작업                   |
| `[browser]`   | 브라우저 자동화 (CDP)                |

## 파일 로테이션

로그 파일은 무한 디스크 사용을 방지하기 위해 자동으로 로테이션됩니다:

- **로테이션 임계값:** 파일당 1 MB
- **유지 파일:** 10개 로테이션 파일 (최대 약 10 MB)
- **로테이션 확인:** 각 쓰기 시
- **명명:** `triggerfish.1.log`, `triggerfish.2.log`, ..., `triggerfish.10.log`

`triggerfish.log`가 1 MB에 도달하면 `triggerfish.1.log`로 이름이 변경되고 이전 `triggerfish.1.log`는 `triggerfish.2.log`가 되는 식입니다. 가장 오래된 파일(`triggerfish.10.log`)이 삭제됩니다.

## Fire-and-Forget 쓰기

파일 쓰기는 비차단입니다. 로거는 디스크 쓰기가 완료될 때까지 요청 처리를 지연시키지 않습니다. 쓰기가 실패하면 -- 디스크 가득 참, 권한 오류, 파일 잠금 -- 오류가 조용히 삼켜집니다.

이것은 의도적입니다. 로깅은 절대 애플리케이션을 크래시시키거나 에이전트를 느리게 해서는 안 됩니다. 파일 쓰기가 실패하면 stderr 출력이 폴백으로 작동합니다.

## 로그 읽기 도구

`log_read` 도구는 에이전트에게 구조화된 로그 기록에 대한 직접 접근을 제공합니다. 에이전트는 최근 로그 항목을 읽고 구성 요소 태그 또는 심각도로 필터링하며 대화를 떠나지 않고 문제를 진단할 수 있습니다.

| 매개변수    | 유형   | 필수   | 설명                                                          |
| ----------- | ------ | ------ | ------------------------------------------------------------- |
| `lines`     | number | 아니오 | 반환할 최근 로그 라인 수 (기본값: 100)                        |
| `level`     | string | 아니오 | 최소 심각도 필터 (`error`, `warn`, `info`, `debug`)           |
| `component` | string | 아니오 | 구성 요소 태그로 필터 (예: `gateway`, `orch`, `provider`)     |

::: tip 에이전트에게 "오늘 어떤 오류가 발생했습니까" 또는 "최근 Gateway 로그를 보여주세요"라고 요청하십시오 -- `log_read` 도구가 필터링 및 검색을 처리합니다. :::

## 로그 보기

### CLI 명령

```bash
# 최근 로그 보기
triggerfish logs

# 실시간 스트리밍
triggerfish logs --tail

# 직접 파일 접근
cat ~/.triggerfish/logs/triggerfish.log
```

### journalctl 사용

Triggerfish가 systemd 서비스로 실행될 때 로그는 journal에도 캡처됩니다:

```bash
journalctl --user -u triggerfish -f
```

## 디버그 vs 구조화된 로깅

::: info `TRIGGERFISH_DEBUG=1` 환경 변수는 이전 버전과의 호환성을 위해 여전히 지원되지만 `logging.level: debug` 구성이 선호됩니다. 둘 다 동등한 출력을 생성합니다 -- 모든 요청/응답 페이로드 및 내부 상태의 전체 TRACE 수준 로깅. :::

## 관련

- [CLI 명령](/ko-KR/guide/commands) -- `triggerfish logs` 명령 참조
- [구성](/ko-KR/guide/configuration) -- 전체 `triggerfish.yaml` 스키마
