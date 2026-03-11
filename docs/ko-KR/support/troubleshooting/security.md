# 문제 해결: 보안 & Classification

## Write-Down 차단

### "Write-down blocked"

이것은 가장 일반적인 보안 오류입니다. 데이터가 더 높은 classification 수준에서 더 낮은 수준으로 흐르려고 시도하고 있음을 의미합니다.

**예:** 세션이 CONFIDENTIAL 데이터에 액세스했습니다(분류된 파일 읽기, 분류된 데이터베이스 쿼리). 세션 taint는 이제 CONFIDENTIAL입니다. 그런 다음 PUBLIC WebChat 채널로 응답을 보내려고 했습니다. CONFIDENTIAL 데이터는 PUBLIC 대상으로 흐를 수 없으므로 정책 엔진이 이를 차단합니다.

```
Write-down blocked: CONFIDENTIAL cannot flow to PUBLIC
```

**해결 방법:**
1. **새 세션을 시작하십시오.** 새 세션은 PUBLIC taint에서 시작합니다. 새 대화를 사용하십시오.
2. **더 높이 분류된 채널을 사용하십시오.** CONFIDENTIAL 이상으로 분류된 채널을 통해 응답을 보내십시오.
3. **taint의 원인을 이해하십시오.** 로그에서 "Taint escalation" 항목을 확인하여 어떤 도구 호출이 세션의 classification을 높였는지 확인하십시오.

### "Session taint cannot flow to channel"

Write-down과 동일하지만 특히 채널 classification에 관한 것입니다:

```
Write-down blocked: your session taint is CONFIDENTIAL, but channel "webchat" is classified as PUBLIC.
Data cannot flow from CONFIDENTIAL to PUBLIC.
```

### "Integration write-down blocked"

분류된 통합에 대한 도구 호출도 write-down을 적용합니다:

```
Session taint CONFIDENTIAL cannot flow to tool_name (classified INTERNAL)
```

이것은 역으로 보일 수 있습니다. 세션 taint가 도구의 classification보다 높습니다. 이는 세션이 더 낮게 분류된 도구를 사용하기에 너무 taint되었음을 의미합니다. 도구를 호출하면 분류된 컨텍스트가 덜 안전한 시스템으로 유출될 수 있다는 우려입니다.

### "Workspace write-down blocked"

에이전트 작업 공간은 디렉토리별 classification을 가집니다. 더 높게 taint된 세션에서 더 낮게 분류된 디렉토리에 쓰기가 차단됩니다:

```
Write-down: CONFIDENTIAL session cannot write to INTERNAL directory
```

---

## Taint 상승

### "Taint escalation"

이것은 정보 메시지이며 오류가 아닙니다. 에이전트가 분류된 데이터에 액세스했기 때문에 세션의 classification 수준이 방금 증가했음을 의미합니다.

```
Taint escalation: PUBLIC → INTERNAL (accessed internal_tool)
```

Taint는 올라가기만 하고 내려가지 않습니다. 세션이 CONFIDENTIAL로 taint되면 세션이 끝날 때까지 그 상태로 유지됩니다.

### "Resource-based taint escalation firing"

도구 호출이 세션의 현재 taint보다 높은 classification의 리소스에 액세스했습니다. 세션 taint가 자동으로 해당 수준으로 상승합니다.

### "Non-owner taint applied"

비소유자 사용자는 채널의 classification 또는 사용자의 권한에 따라 세션이 taint될 수 있습니다. 이것은 리소스 기반 taint와는 별개입니다.

---

## SSRF (Server-Side Request Forgery)

### "SSRF blocked: hostname resolves to private IP"

모든 아웃바운드 HTTP 요청(web_fetch, 브라우저 내비게이션, MCP SSE 연결)은 SSRF 보호를 거칩니다. 대상 호스트 이름이 사설 IP 주소로 해석되면 요청이 차단됩니다.

**차단되는 범위:**
- `127.0.0.0/8` (루프백)
- `10.0.0.0/8` (사설)
- `172.16.0.0/12` (사설)
- `192.168.0.0/16` (사설)
- `169.254.0.0/16` (링크 로컬)
- `0.0.0.0/8` (미지정)
- `::1` (IPv6 루프백)
- `fc00::/7` (IPv6 ULA)
- `fe80::/10` (IPv6 링크 로컬)

이 보호는 하드코딩되어 있으며 비활성화하거나 구성할 수 없습니다. AI 에이전트가 내부 서비스에 액세스하도록 속이는 것을 방지합니다.

**IPv4-mapped IPv6:** `::ffff:127.0.0.1`과 같은 주소가 감지되어 차단됩니다.

### "SSRF check blocked outbound request"

위와 동일하지만 SSRF 모듈이 아닌 web_fetch 도구에서 로그됩니다.

### DNS 해석 실패

```
DNS resolution failed for hostname
No DNS records found for hostname
```

호스트 이름을 해석할 수 없습니다. 확인 사항:
- URL이 올바르게 입력되었는지
- DNS 서버에 접근할 수 있는지
- 도메인이 실제로 존재하는지

---

## 정책 엔진

### "Hook evaluation failed, defaulting to BLOCK"

정책 hook이 평가 중 예외를 발생시켰습니다. 이 경우 기본 동작은 BLOCK(거부)입니다. 이것이 안전한 기본값입니다.

전체 예외에 대해 로그를 확인하십시오. 사용자 정의 정책 규칙의 버그를 나타낼 가능성이 높습니다.

### "Policy rule blocked action"

정책 규칙이 동작을 명시적으로 거부했습니다. 로그 항목에는 어떤 규칙이 실행되었는지와 이유가 포함됩니다. 구성의 `policy.rules` 섹션을 확인하여 어떤 규칙이 정의되어 있는지 확인하십시오.

### "Tool floor violation"

최소 classification 수준을 필요로 하는 도구가 호출되었지만 세션이 해당 수준 미만입니다.

**예:** healthcheck 도구는 시스템 내부를 노출하기 때문에 최소 INTERNAL classification이 필요합니다. PUBLIC 세션이 이를 사용하려고 하면 호출이 차단됩니다.

---

## 플러그인 & Skill 보안

### "Plugin network access blocked"

플러그인은 제한된 네트워크 액세스가 있는 샌드박스에서 실행됩니다. 선언된 엔드포인트 도메인의 URL에만 접근할 수 있습니다.

```
Plugin network access blocked: invalid URL
Plugin SSRF blocked
```

플러그인이 선언된 엔드포인트에 없는 URL에 접근하려고 했거나, URL이 사설 IP로 해석되었습니다.

### "Skill activation blocked by classification ceiling"

Skill은 SKILL.md frontmatter에서 `classification_ceiling`을 선언합니다. Ceiling이 세션의 taint 수준 미만이면 skill을 활성화할 수 없습니다:

```
Cannot activate skill below session taint (write-down risk).
INTERNAL ceiling but session taint is CONFIDENTIAL.
```

이는 더 낮게 분류된 skill이 더 높게 분류된 데이터에 노출되는 것을 방지합니다.

### "Skill content integrity check failed"

설치 후, Triggerfish는 skill의 콘텐츠를 해시합니다. 해시가 변경되면(설치 후 skill이 수정됨) 무결성 검사가 실패합니다:

```
Skill content hash mismatch detected
```

이는 변조를 나타낼 수 있습니다. 신뢰할 수 있는 소스에서 skill을 다시 설치하십시오.

### "Skill install rejected by scanner"

보안 스캐너가 skill에서 의심스러운 콘텐츠를 발견했습니다. 스캐너는 악의적인 행동을 나타낼 수 있는 패턴을 확인합니다. 구체적인 경고가 오류 메시지에 포함됩니다.

---

## 세션 보안

### "Session not found"

```
Session not found: <session-id>
```

요청된 세션이 세션 관리자에 존재하지 않습니다. 정리되었거나 세션 ID가 유효하지 않을 수 있습니다.

### "Session status access denied: taint exceeds caller"

세션의 상태를 보려고 했지만, 해당 세션의 taint 수준이 현재 세션보다 높습니다. 이는 더 낮게 분류된 세션이 더 높게 분류된 작업에 대해 알게 되는 것을 방지합니다.

### "Session history access denied"

위와 동일한 개념이지만 대화 기록 조회에 대한 것입니다.

---

## 에이전트 팀

### "Team message delivery denied: team status is ..."

팀이 `running` 상태가 아닙니다. 다음과 같은 경우에 발생합니다:

- 팀이 **해산됨** (수동으로 또는 수명 주기 모니터에 의해)
- 리드 세션이 실패하여 팀이 **일시 중지됨**
- 수명 제한을 초과하여 팀이 **시간 초과됨**

`team_status`로 팀의 현재 상태를 확인하십시오. 리드 실패로 인해 팀이 일시 중지된 경우 `team_disband`로 해산하고 새로 생성할 수 있습니다.

### "Team member not found" / "Team member ... is not active"

대상 멤버가 존재하지 않거나(잘못된 역할 이름) 종료되었습니다. 멤버가 종료되는 경우:

- 유휴 타임아웃 초과 시(2x `idle_timeout_seconds`)
- 팀이 해산될 때
- 세션이 충돌하고 수명 주기 모니터가 감지할 때

`team_status`를 사용하여 모든 멤버와 현재 상태를 확인하십시오.

### "Team disband denied: only the lead or creating session can disband"

두 세션만 팀을 해산할 수 있습니다:

1. 원래 `team_create`를 호출한 세션
2. 리드 멤버의 세션

팀 내에서 이 오류가 발생하면 호출하는 멤버가 리드가 아닙니다. 팀 외부에서 발생하면 팀을 생성한 세션이 아닙니다.

### 생성 후 팀 리드가 즉시 실패

리드의 에이전트 세션이 첫 번째 턴을 완료할 수 없었습니다. 일반적인 원인:

1. **LLM provider 오류:** provider가 오류를 반환함(속도 제한, 인증 실패, 모델 미발견). `triggerfish logs`에서 provider 오류를 확인하십시오.
2. **Classification ceiling이 너무 낮음:** 리드가 ceiling 이상으로 분류된 도구가 필요하면 첫 번째 도구 호출에서 세션이 실패할 수 있습니다.
3. **도구 누락:** 리드가 작업을 분해하기 위해 특정 도구가 필요할 수 있습니다. 도구 프로필이 올바르게 구성되어 있는지 확인하십시오.

### 팀 멤버가 유휴 상태이며 출력을 생성하지 않음

멤버는 리드가 `sessions_send`를 통해 작업을 보내기를 기다립니다. 리드가 작업을 분해하지 않으면:

- 리드의 모델이 팀 조율을 이해하지 못할 수 있습니다. 리드 역할에 더 유능한 모델을 시도하십시오.
- `task` 설명이 리드가 하위 작업으로 분해하기에 너무 모호할 수 있습니다.
- `team_status`를 확인하여 리드가 `active`이고 최근 활동이 있는지 확인하십시오.

### 팀 멤버 간 "Write-down blocked"

팀 멤버는 모든 세션과 동일한 classification 규칙을 따릅니다. 한 멤버가 `CONFIDENTIAL`로 taint되었고 `PUBLIC` 멤버에게 데이터를 보내려고 하면 write-down 검사가 차단합니다. 이것은 예상된 동작입니다 -- 분류된 데이터는 팀 내에서도 더 낮게 분류된 세션으로 흐를 수 없습니다.

---

## 위임 & 멀티 에이전트

### "Delegation certificate signature invalid"

에이전트 위임은 암호화 인증서를 사용합니다. 서명 검사가 실패하면 위임이 거부됩니다. 이는 위조된 위임 체인을 방지합니다.

### "Delegation certificate expired"

위임 인증서에 TTL(유효 기간)이 있습니다. 만료되면 위임받은 에이전트가 더 이상 위임자를 대신하여 행동할 수 없습니다.

### "Delegation chain linkage broken"

다중 홉 위임(A가 B에게, B가 C에게)에서 체인의 각 링크가 유효해야 합니다. 어떤 링크라도 끊어지면 전체 체인이 거부됩니다.

---

## Webhook

### "Webhook HMAC verification failed"

들어오는 webhook은 인증을 위해 HMAC 서명이 필요합니다. 서명이 누락되거나, 잘못되거나, 일치하지 않으면:

```
Webhook HMAC verification failed: missing secret or body
Webhook HMAC verification failed: signature parse error
Webhook signature verification failed: length mismatch
Webhook signature verification failed: signature mismatch
```

확인 사항:
- Webhook 소스가 올바른 HMAC 서명 헤더를 전송하고 있는지
- 구성의 공유 secret이 소스의 secret과 일치하는지
- 서명 형식이 일치하는지(hex 인코딩된 HMAC-SHA256)

### "Webhook replay detected"

Triggerfish에는 재생 보호가 포함되어 있습니다. webhook 페이로드가 두 번째로 수신되면(동일한 서명) 거부됩니다.

### "Webhook rate limit exceeded"

```
Webhook rate limit exceeded: source=<sourceId>
```

짧은 기간에 동일한 소스로부터 너무 많은 webhook 요청이 발생했습니다. 이는 webhook 홍수로부터 보호합니다. 잠시 기다린 후 다시 시도하십시오.

---

## 감사 무결성

### "previousHash mismatch"

감사 로그는 해시 체이닝을 사용합니다. 각 항목에는 이전 항목의 해시가 포함됩니다. 체인이 끊어지면 감사 로그가 변조되었거나 손상되었음을 의미합니다.

### "HMAC mismatch"

감사 항목의 HMAC 서명이 일치하지 않습니다. 항목이 생성 후 수정되었을 수 있습니다.
