# 좋은 이슈 작성 방법

잘 구성된 이슈는 더 빨리 해결됩니다. 로그와 재현 단계가 없는 모호한 이슈는 아무도 조치할 수 없어 몇 주간 방치될 수 있습니다. 포함해야 할 내용은 다음과 같습니다.

## 작성 전에

1. **기존 이슈를 검색하십시오.** 누군가 이미 동일한 문제를 보고했을 수 있습니다. [열린 이슈](https://github.com/greghavens/triggerfish/issues)와 [닫힌 이슈](https://github.com/greghavens/triggerfish/issues?q=is%3Aissue+is%3Aclosed)를 확인하십시오.

2. **문제 해결 가이드를 확인하십시오.** [문제 해결 섹션](/ko-KR/support/troubleshooting/)은 대부분의 일반적인 문제를 다룹니다.

3. **알려진 문제를 확인하십시오.** [알려진 문제](/ko-KR/support/kb/known-issues) 페이지에 이미 인지하고 있는 문제가 나열되어 있습니다.

4. **최신 버전을 사용해 보십시오.** 최신 릴리스를 사용하지 않는 경우 먼저 업데이트하십시오:
   ```bash
   triggerfish update
   ```

## 포함해야 할 내용

### 1. 환경

```
Triggerfish 버전: (`triggerfish version` 실행)
OS: (예: macOS 15.2, Ubuntu 24.04, Windows 11, Docker)
아키텍처: (x64 또는 arm64)
설치 방법: (바이너리 설치 프로그램, 소스 빌드, Docker)
```

### 2. 재현 단계

문제를 일으키는 정확한 동작 순서를 작성하십시오. 구체적으로 작성하십시오:

**나쁜 예:**
> 봇이 작동을 멈췄습니다.

**좋은 예:**
> 1. Telegram 채널이 구성된 상태에서 Triggerfish를 시작했습니다
> 2. 봇에게 DM으로 "내일 일정 확인해 줘" 메시지를 보냈습니다
> 3. 봇이 일정 결과로 응답했습니다
> 4. "그 결과를 alice@example.com으로 이메일로 보내 줘"를 보냈습니다
> 5. 예상: 봇이 이메일을 전송
> 6. 실제: 봇이 "Write-down blocked: CONFIDENTIAL cannot flow to INTERNAL"로 응답

### 3. 예상 동작 vs 실제 동작

무엇이 일어나야 했는지와 실제로 무엇이 일어났는지를 작성하십시오. 오류 메시지가 있으면 정확한 오류 메시지를 포함하십시오. 의역보다 복사-붙여넣기가 좋습니다.

### 4. 로그 출력

[로그 번들](/ko-KR/support/guides/collecting-logs)을 첨부하십시오:

```bash
triggerfish logs bundle
```

이슈가 보안에 민감한 경우 일부를 수정할 수 있지만, 이슈에 수정한 내용을 명시하십시오.

최소한 관련 로그 줄을 붙여넣으십시오. 이벤트를 연관시킬 수 있도록 타임스탬프를 포함하십시오.

### 5. 구성 (수정됨)

`triggerfish.yaml`의 관련 섹션을 붙여넣으십시오. **항상 secret을 수정하십시오.** 실제 값을 플레이스홀더로 교체하십시오:

```yaml
# 좋음 - secret 수정됨
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"  # keychain에 저장
channels:
  telegram:
    ownerId: "수정됨"
    classification: INTERNAL
```

### 6. Patrol 출력

```bash
triggerfish patrol
```

출력을 붙여넣으십시오. 시스템 상태의 빠른 스냅샷을 제공합니다.

## 이슈 유형

### 버그 리포트

작동하지 않는 것에 대해 이 템플릿을 사용하십시오:

```markdown
## 버그 리포트

**환경:**
- 버전:
- OS:
- 설치 방법:

**재현 단계:**
1.
2.
3.

**예상 동작:**

**실제 동작:**

**오류 메시지 (있는 경우):**

**Patrol 출력:**

**관련 구성 (수정됨):**

**로그 번들:** (파일 첨부)
```

### 기능 요청

```markdown
## 기능 요청

**문제:** 현재 할 수 없는 무엇을 하려고 합니까?

**제안 솔루션:** 어떻게 작동해야 한다고 생각하십니까?

**고려한 대안:** 다른 무엇을 시도했습니까?
```

### 질문 / 지원 요청

무언가가 버그인지 확실하지 않거나 막혀 있는 경우 Issues 대신 [GitHub Discussions](https://github.com/greghavens/triggerfish/discussions)를 사용하십시오. Discussions는 단일 정답이 없을 수 있는 질문에 더 적합합니다.

## 포함하지 말아야 할 내용

- **원시 API 키 또는 비밀번호.** 항상 수정하십시오.
- **대화의 개인 데이터.** 이름, 이메일, 전화번호를 수정하십시오.
- **전체 로그 파일 인라인.** 수천 줄을 붙여넣는 대신 로그 번들을 파일로 첨부하십시오.

## 작성 후

- **후속 질문을 확인하십시오.** 유지보수 담당자가 더 많은 정보를 필요로 할 수 있습니다.
- **수정을 테스트하십시오.** 수정이 푸시되면 확인을 요청받을 수 있습니다.
- **직접 해결책을 찾은 경우 이슈를 닫으십시오.** 다른 사람들이 혜택을 받을 수 있도록 해결책을 게시하십시오.
