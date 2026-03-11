# KB: 주요 변경 사항

업그레이드 시 조치가 필요할 수 있는 버전별 변경 사항 목록입니다.

## Notion: `client_secret` 제거

**커밋:** 6d876c3

보안 강화 조치로 Notion 통합 구성에서 `client_secret` 필드가 제거되었습니다. Notion은 이제 OS keychain에 저장된 OAuth 토큰만 사용합니다.

**필요한 조치:** `triggerfish.yaml`에 `notion.client_secret` 필드가 있으면 제거하십시오. 무시되지만 혼란을 줄 수 있습니다.

**새로운 설정 흐름:**

```bash
triggerfish connect notion
```

이 명령은 통합 토큰을 keychain에 저장합니다. client secret은 필요하지 않습니다.

---

## 도구 이름: 점에서 밑줄로

**커밋:** 505a443

모든 도구 이름이 점 표기법(`foo.bar`)에서 밑줄 표기법(`foo_bar`)으로 변경되었습니다. 일부 LLM provider가 도구 이름의 점을 지원하지 않아 도구 호출 실패가 발생했습니다.

**필요한 조치:** 점이 있는 도구 이름을 참조하는 사용자 정의 정책 규칙이나 skill 정의가 있으면 밑줄을 사용하도록 업데이트하십시오:

```yaml
# 변경 전
- tool: notion.search

# 변경 후
- tool: notion_search
```

---

## Windows 설치 프로그램: Move-Item에서 Copy-Item으로

**커밋:** 5e0370f

Windows PowerShell 설치 프로그램이 업그레이드 시 바이너리 교체를 위해 `Move-Item -Force`에서 `Copy-Item -Force`로 변경되었습니다. `Move-Item`은 Windows에서 파일을 안정적으로 덮어쓰지 않습니다.

**필요한 조치:** 새로 설치하는 경우 없음. 이전 버전에서 `triggerfish update`가 Windows에서 실패하면 업데이트 전에 서비스를 수동으로 중지하십시오:

```powershell
Stop-Service Triggerfish
# 그런 다음 설치 프로그램 또는 triggerfish update를 다시 실행
```

---

## 버전 스탬핑: 런타임에서 빌드 타임으로

**커밋:** e8b0c8c, eae3930, 6ce0c25

버전 정보가 런타임 감지(`deno.json` 확인)에서 git 태그 기반의 빌드 타임 스탬핑으로 이동했습니다. CLI 배너는 더 이상 하드코딩된 버전 문자열을 표시하지 않습니다.

**필요한 조치:** 없음. `triggerfish version`은 계속 작동합니다. 개발 빌드는 버전으로 `dev`를 표시합니다.

---

## Signal: JRE 21에서 JRE 25로

**커밋:** e5b1047

Signal 채널의 자동 설치 프로그램이 JRE 21 대신 JRE 25(Adoptium에서)를 다운로드하도록 업데이트되었습니다. signal-cli 버전도 v0.14.0으로 고정되었습니다.

**필요한 조치:** 이전 JRE가 있는 기존 signal-cli 설치가 있으면 Signal 설정을 다시 실행하십시오:

```bash
triggerfish config add-channel signal
```

이 명령은 업데이트된 JRE와 signal-cli를 다운로드합니다.

---

## Secrets: 평문에서 암호화로

Secrets 저장 형식이 평문 JSON에서 AES-256-GCM 암호화 JSON으로 변경되었습니다.

**필요한 조치:** 없음. 마이그레이션은 자동입니다. 자세한 내용은 [Secrets 마이그레이션](/ko-KR/support/kb/secrets-migration)을 참조하십시오.

마이그레이션 후 평문 버전이 이전에 디스크에 저장되었으므로 secret 순환을 권장합니다.

---

## Tidepool: 콜백에서 Canvas 프로토콜로

Tidepool(A2UI) 인터페이스가 콜백 기반 `TidepoolTools` 인터페이스에서 canvas 기반 프로토콜로 마이그레이션되었습니다.

**영향받는 파일:**
- `src/tools/tidepool/tools/tools_legacy.ts` (이전 인터페이스, 호환성을 위해 유지)
- `src/tools/tidepool/tools/tools_canvas.ts` (새 인터페이스)

**필요한 조치:** 이전 Tidepool 콜백 인터페이스를 사용하는 사용자 정의 skill이 있으면 레거시 shim을 통해 계속 작동합니다. 새 skill은 canvas 프로토콜을 사용해야 합니다.

---

## 구성: 레거시 `primary` 문자열 형식

`models.primary` 필드는 이전에 일반 문자열(`"anthropic/claude-sonnet-4-20250514"`)을 허용했습니다. 이제 객체가 필요합니다:

```yaml
# 레거시 (하위 호환성을 위해 여전히 허용)
models:
  primary: "anthropic/claude-sonnet-4-20250514"

# 현재 (권장)
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**필요한 조치:** 객체 형식으로 업데이트하십시오. 문자열 형식은 여전히 파싱되지만 향후 버전에서 제거될 수 있습니다.

---

## 콘솔 로깅: 제거

**커밋:** 9ce1ce5

모든 원시 `console.log`, `console.warn`, `console.error` 호출이 구조화된 로거(`createLogger()`)로 마이그레이션되었습니다. Triggerfish는 daemon으로 실행되므로 stdout/stderr 출력은 사용자에게 표시되지 않습니다. 모든 로깅은 이제 파일 writer를 통해 이루어집니다.

**필요한 조치:** 없음. 디버깅을 위해 콘솔 출력에 의존했다면(예: stdout 파이핑) 대신 `triggerfish logs`를 사용하십시오.

---

## 영향 추정

여러 버전에 걸쳐 업그레이드할 때 위의 각 항목을 확인하십시오. 대부분의 변경 사항은 자동 마이그레이션으로 하위 호환됩니다. 수동 조치가 필요한 변경 사항은 다음뿐입니다:

1. **Notion client_secret 제거** (구성에서 필드 제거)
2. **도구 이름 형식 변경** (사용자 정의 정책 규칙 업데이트)
3. **Signal JRE 업데이트** (Signal을 사용하는 경우 Signal 설정 다시 실행)

나머지는 모두 자동으로 처리됩니다.
