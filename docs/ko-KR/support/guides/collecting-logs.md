# 로그 수집

버그 리포트를 작성할 때 로그 번들은 유지보수 담당자에게 세부 정보를 주고받지 않고도 문제를 진단하는 데 필요한 정보를 제공합니다.

## 빠른 번들

로그 번들을 생성하는 가장 빠른 방법:

```bash
triggerfish logs bundle
```

이 명령은 `~/.triggerfish/logs/`의 모든 로그 파일을 포함하는 아카이브를 생성합니다:

- **Linux/macOS:** `triggerfish-logs.tar.gz`
- **Windows:** `triggerfish-logs.zip`

아카이브 생성이 어떤 이유로든 실패하면 수동으로 압축할 수 있는 디렉토리에 원시 로그 파일을 복사하는 것으로 대체됩니다.

## 번들에 포함되는 내용

- `triggerfish.log` (현재 로그 파일)
- `triggerfish.1.log`부터 `triggerfish.10.log`까지 (로테이션된 백업, 존재하는 경우)

번들에 포함되**지 않는** 내용:
- `triggerfish.yaml` 구성 파일
- Secret 키 또는 자격 증명
- SQLite 데이터베이스
- SPINE.md 또는 TRIGGER.md

## 수동 로그 수집

번들 명령을 사용할 수 없는 경우(이전 버전, Docker 등):

```bash
# 로그 파일 찾기
ls ~/.triggerfish/logs/

# 수동으로 아카이브 생성
tar czf triggerfish-logs.tar.gz ~/.triggerfish/logs/

# Docker
docker cp triggerfish:/data/logs/ ./triggerfish-logs/
tar czf triggerfish-logs.tar.gz triggerfish-logs/
```

## 로그 상세도 높이기

기본적으로 로그는 INFO 수준입니다. 버그 리포트를 위해 더 많은 세부 정보를 캡처하려면:

1. 로그 수준을 verbose 또는 debug로 설정하십시오:
   ```bash
   triggerfish config set logging.level verbose
   # 또는 최대 상세도:
   triggerfish config set logging.level debug
   ```

2. 문제를 재현하십시오

3. 번들을 수집하십시오:
   ```bash
   triggerfish logs bundle
   ```

4. 수준을 normal로 되돌리십시오:
   ```bash
   triggerfish config set logging.level normal
   ```

### 로그 수준 상세도

| 수준 | 캡처하는 내용 |
|-------|-----------------|
| `quiet` | 오류만 |
| `normal` | 오류, 경고, 정보 (기본값) |
| `verbose` | 디버그 메시지 추가 (도구 호출, provider 상호작용, classification 결정) |
| `debug` | 트레이스 수준 메시지 포함 모든 것 (원시 프로토콜 데이터, 내부 상태 변경) |

**경고:** `debug` 수준은 많은 출력을 생성합니다. 문제를 적극적으로 재현할 때만 사용한 후 다시 전환하십시오.

## 실시간 로그 필터링

문제를 재현하는 동안 실시간 로그 스트림을 필터링할 수 있습니다:

```bash
# 오류만 표시
triggerfish logs --level ERROR

# 경고 이상 표시
triggerfish logs --level WARN
```

Linux/macOS에서는 필터링이 포함된 네이티브 `tail -f`를 사용합니다. Windows에서는 PowerShell `Get-Content -Wait -Tail`을 사용합니다.

## 로그 형식

각 로그 줄은 다음 형식을 따릅니다:

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] Gateway WebSocket server started on port 18789
```

- **타임스탬프:** UTC의 ISO 8601
- **수준:** ERROR, WARN, INFO, DEBUG 또는 TRACE
- **컴포넌트:** 로그를 생성한 모듈 (예: `gateway`, `anthropic`, `telegram`, `policy`)
- **메시지:** 구조화된 컨텍스트가 포함된 로그 메시지

## 버그 리포트에 포함할 내용

로그 번들과 함께 다음을 포함하십시오:

1. **재현 단계.** 문제가 발생했을 때 무엇을 하고 있었습니까?
2. **예상 동작.** 무엇이 일어나야 했습니까?
3. **실제 동작.** 대신 무엇이 일어났습니까?
4. **플랫폼 정보.** OS, 아키텍처, Triggerfish 버전 (`triggerfish version`)
5. **구성 발췌.** `triggerfish.yaml`의 관련 섹션 (secret 수정)

전체 체크리스트는 [이슈 작성](/ko-KR/support/guides/filing-issues)을 참조하십시오.

## 로그의 민감한 정보

Triggerfish는 로그에서 외부 데이터를 `<<`와 `>>` 구분자로 래핑하여 살균합니다. API 키와 토큰은 로그 출력에 나타나지 않아야 합니다. 그러나 로그 번들을 제출하기 전에:

1. 공유하고 싶지 않은 내용이 있는지 스캔하십시오 (이메일 주소, 파일 경로, 메시지 내용)
2. 필요한 경우 수정하십시오
3. 번들이 수정되었음을 이슈에 명시하십시오

로그 파일에는 대화의 메시지 내용이 포함됩니다. 대화에 민감한 정보가 포함된 경우 공유하기 전에 해당 부분을 수정하십시오.
