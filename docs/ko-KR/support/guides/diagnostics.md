# 진단 실행

Triggerfish에는 두 가지 내장 진단 도구가 있습니다: `patrol`(외부 상태 점검) 및 `healthcheck` 도구(내부 시스템 탐사).

## Patrol

Patrol은 핵심 시스템이 작동 중인지 확인하는 CLI 명령입니다:

```bash
triggerfish patrol
```

### 확인하는 항목

| 검사 | 상태 | 의미 |
|-------|--------|---------|
| Gateway 실행 중 | 다운 시 CRITICAL | WebSocket 제어 평면이 응답하지 않음 |
| LLM 연결됨 | 다운 시 CRITICAL | 기본 LLM provider에 접근할 수 없음 |
| 채널 활성 | 0일 때 WARNING | 연결된 채널 어댑터 없음 |
| 정책 규칙 로드됨 | 0일 때 WARNING | 로드된 정책 규칙 없음 |
| Skill 설치됨 | 0일 때 WARNING | 검색된 skill 없음 |

### 전체 상태

- **HEALTHY** - 모든 검사 통과
- **WARNING** - 일부 비치명적 검사에 플래그 (예: skill 미설치)
- **CRITICAL** - 하나 이상의 치명적 검사 실패 (gateway 또는 LLM 접근 불가)

### Patrol 사용 시기

- 설치 후 모든 것이 작동하는지 확인할 때
- 구성 변경 후 daemon이 정상적으로 재시작되었는지 확인할 때
- 봇이 응답을 멈췄을 때 어떤 구성 요소가 실패했는지 좁힐 때
- 버그 리포트 작성 전 patrol 출력을 포함할 때

### 출력 예시

```
Triggerfish Patrol Report
=========================
Overall: HEALTHY

[OK]      Gateway running
[OK]      LLM connected (anthropic)
[OK]      Channels active (3)
[OK]      Policy rules loaded (12)
[WARNING] Skills installed (0)
```

---

## Healthcheck 도구

Healthcheck 도구는 실행 중인 gateway 내부에서 시스템 구성 요소를 탐사하는 내부 에이전트 도구입니다. 대화 중 에이전트에서 사용할 수 있습니다.

### 확인하는 항목

**Provider:**
- 기본 provider가 존재하고 접근 가능한지
- Provider 이름 반환

**스토리지:**
- 라운드트립 테스트: 키 쓰기, 읽기, 삭제
- 스토리지 계층이 기능하는지 검증

**Skill:**
- 소스별 검색된 skill 수 (번들, 설치, 작업 공간)

**구성:**
- 기본 구성 유효성 검사

### 상태 수준

각 구성 요소는 다음 중 하나를 보고합니다:
- `healthy` - 완전히 작동
- `degraded` - 부분적으로 작동 (일부 기능이 작동하지 않을 수 있음)
- `error` - 구성 요소가 고장남

### Classification 요구 사항

Healthcheck 도구는 시스템 내부(provider 이름, skill 수, 스토리지 상태)를 노출하므로 최소 INTERNAL classification이 필요합니다. PUBLIC 세션에서는 사용할 수 없습니다.

### Healthcheck 사용

에이전트에게 요청하십시오:

> healthcheck를 실행하십시오

또는 도구를 직접 사용하는 경우:

```
tool: healthcheck
```

응답은 구조화된 보고서입니다:

```
Overall: healthy

Providers: healthy
  Default provider: anthropic

Storage: healthy
  Round-trip test passed

Skills: healthy
  12 skills discovered

Config: healthy
```

---

## 진단 결합

철저한 진단 세션을 위해:

1. CLI에서 **patrol을 실행하십시오:**
   ```bash
   triggerfish patrol
   ```

2. 최근 오류에 대해 **로그를 확인하십시오:**
   ```bash
   triggerfish logs --level ERROR
   ```

3. **에이전트에게** healthcheck를 실행하도록 요청하십시오 (에이전트가 응답하는 경우):
   > 시스템 healthcheck를 실행하고 문제가 있으면 알려 주십시오

4. 이슈를 작성해야 하면 **로그 번들을 수집하십시오:**
   ```bash
   triggerfish logs bundle
   ```

---

## 시작 진단

Daemon이 전혀 시작되지 않으면 다음을 순서대로 확인하십시오:

1. **구성이 존재하고 유효한지:**
   ```bash
   triggerfish config validate
   ```

2. **Secret이 해석될 수 있는지:**
   ```bash
   triggerfish config get-secret --list
   ```

3. **포트 충돌 없는지:**
   ```bash
   # Linux
   ss -tlnp | grep -E '18789|18790'
   # macOS
   lsof -i :18789 -i :18790
   ```

4. **다른 인스턴스가 실행 중이 아닌지:**
   ```bash
   triggerfish status
   ```

5. **시스템 journal 확인 (Linux):**
   ```bash
   journalctl --user -u triggerfish.service --no-pager -n 50
   ```

6. **launchd 확인 (macOS):**
   ```bash
   launchctl print gui/$(id -u)/dev.triggerfish.agent
   ```

7. **Windows 이벤트 로그 확인 (Windows):**
   ```powershell
   Get-EventLog -LogName Application -Source Triggerfish -Newest 10
   ```
