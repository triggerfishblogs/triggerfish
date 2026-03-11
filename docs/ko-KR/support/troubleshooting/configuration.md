# 문제 해결: 구성

## YAML 파싱 오류

### "Configuration parse failed"

YAML 파일에 구문 오류가 있습니다. 일반적인 원인:

- **들여쓰기 불일치.** YAML은 공백에 민감합니다. 탭이 아닌 스페이스를 사용하십시오. 각 중첩 수준은 정확히 2개의 스페이스여야 합니다.
- **인용되지 않은 특수 문자.** `:`, `#`, `{`, `}`, `[`, `]`, 또는 `&`를 포함하는 값은 인용해야 합니다.
- **키 뒤에 콜론 누락.** 모든 키에는 `: `(콜론 다음에 스페이스)가 필요합니다.

YAML을 검증하십시오:

```bash
triggerfish config validate
```

또는 온라인 YAML 유효성 검사기를 사용하여 정확한 줄을 찾으십시오.

### "Configuration file did not parse to an object"

YAML 파일이 성공적으로 파싱되었지만 결과가 YAML 매핑(객체)이 아닙니다. 파일에 스칼라 값, 목록만 포함되어 있거나 비어 있는 경우 발생합니다.

`triggerfish.yaml`은 최상위 매핑이 있어야 합니다. 최소한:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
```

### "Configuration file not found"

Triggerfish는 다음 경로에서 순서대로 구성을 찾습니다:

1. `$TRIGGERFISH_CONFIG` 환경 변수 (설정된 경우)
2. `$TRIGGERFISH_DATA_DIR/triggerfish.yaml` (`TRIGGERFISH_DATA_DIR`이 설정된 경우)
3. `/data/triggerfish.yaml` (Docker 환경)
4. `~/.triggerfish/triggerfish.yaml` (기본값)

구성을 생성하려면 설정 마법사를 실행하십시오:

```bash
triggerfish dive
```

---

## 유효성 검사 오류

### "Configuration validation failed"

YAML이 파싱되었지만 구조 유효성 검사에 실패했습니다. 구체적인 메시지:

**"models is required"** 또는 **"models.primary is required"**

`models` 섹션은 필수입니다. 최소한 기본 provider와 모델이 필요합니다:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**"primary.provider must be non-empty"** 또는 **"primary.model must be non-empty"**

`primary` 필드에는 `provider`와 `model`이 모두 비어 있지 않은 문자열로 설정되어야 합니다.

**`classification_models`의 "Invalid classification level"**

유효한 수준은: `RESTRICTED`, `CONFIDENTIAL`, `INTERNAL`, `PUBLIC`입니다. 대소문자를 구분합니다. `classification_models` 키를 확인하십시오.

---

## Secret 참조 오류

### 시작 시 Secret이 해석되지 않음

구성에 `secret:some-key`가 포함되어 있고 해당 키가 keychain에 존재하지 않으면 daemon이 다음과 같은 오류와 함께 종료됩니다:

```
Secret resolution failed: key "provider:anthropic:apiKey" not found
```

**해결 방법:**

```bash
# 어떤 secret이 있는지 나열
triggerfish config get-secret --list

# 누락된 secret 저장
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Secret 백엔드를 사용할 수 없음

Linux에서 secret 저장소는 `secret-tool`(libsecret / GNOME Keyring)을 사용합니다. Secret Service D-Bus 인터페이스를 사용할 수 없는 경우(headless 서버, 최소 컨테이너) secret을 저장하거나 검색할 때 오류가 발생합니다.

**Headless Linux용 해결 방법:**

1. `gnome-keyring` 및 `libsecret` 설치:
   ```bash
   # Debian/Ubuntu
   sudo apt install gnome-keyring libsecret-tools

   # Fedora
   sudo dnf install gnome-keyring libsecret
   ```

2. keyring daemon 시작:
   ```bash
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

3. 또는 암호화된 파일 대체를 사용하려면 다음을 설정하십시오:
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   참고: 메모리 대체는 재시작 시 secret이 손실됩니다. 테스트용으로만 적합합니다.

---

## 구성 값 문제

### Boolean 변환

`triggerfish config set` 사용 시 문자열 값 `"true"`와 `"false"`는 자동으로 YAML boolean으로 변환됩니다. 실제로 리터럴 문자열 `"true"`가 필요한 경우 YAML 파일을 직접 편집하십시오.

마찬가지로 정수처럼 보이는 문자열(`"8080"`)은 숫자로 변환됩니다.

### 점 구분 경로 구문

`config set` 및 `config get` 명령은 점 구분 경로를 사용하여 중첩된 YAML을 탐색합니다:

```bash
triggerfish config set models.primary.provider openai
triggerfish config get channels.telegram.ownerId
triggerfish config set scheduler.trigger.interval "30m"
```

경로 세그먼트에 점이 포함된 경우 이스케이프 구문이 없습니다. YAML 파일을 직접 편집하십시오.

### `config get`의 Secret 마스킹

"key", "secret" 또는 "token"을 포함하는 키에 대해 `triggerfish config get`을 실행하면 출력이 마스킹됩니다: `****...****`으로 처음 4자와 마지막 4자만 표시됩니다. 이것은 의도된 동작입니다. 실제 값을 가져오려면 `triggerfish config get-secret <key>`를 사용하십시오.

---

## 구성 백업

Triggerfish는 모든 `config set`, `config add-channel` 또는 `config add-plugin` 작업 전에 `~/.triggerfish/backups/`에 타임스탬프가 있는 백업을 생성합니다. 최대 10개의 백업이 유지됩니다.

백업을 복원하려면:

```bash
ls ~/.triggerfish/backups/
cp ~/.triggerfish/backups/triggerfish.yaml.2026-02-15T10-30-00Z ~/.triggerfish/triggerfish.yaml
triggerfish stop && triggerfish start
```

---

## Provider 검증

설정 마법사는 각 provider의 모델 목록 엔드포인트를 호출하여 API 키를 검증합니다(토큰을 소비하지 않음). 검증 엔드포인트는 다음과 같습니다:

| Provider | 엔드포인트 |
|----------|----------|
| Anthropic | `https://api.anthropic.com/v1/models` |
| OpenAI | `https://api.openai.com/v1/models` |
| Google | `https://generativelanguage.googleapis.com/v1beta/models` |
| Fireworks | `https://api.fireworks.ai/v1/accounts/fireworks/models` |
| OpenRouter | `https://openrouter.ai/api/v1/models` |
| ZenMux | `https://zenmux.ai/api/v1/models` |
| Z.AI | `https://api.z.ai/api/coding/paas/v4/models` |
| Ollama | `http://localhost:11434/v1/models` |
| LM Studio | `http://localhost:1234/v1/models` |

검증이 실패하면 다음을 다시 확인하십시오:
- API 키가 올바르고 만료되지 않았는지
- 네트워크에서 엔드포인트에 접근할 수 있는지
- 로컬 provider(Ollama, LM Studio)의 경우 서버가 실제로 실행 중인지

### 모델을 찾을 수 없음

검증은 성공했지만 모델을 찾을 수 없으면 마법사가 경고합니다. 일반적으로 다음을 의미합니다:

- **모델 이름에 오타.** 정확한 모델 ID는 provider의 문서를 확인하십시오.
- **Ollama 모델이 pull되지 않음.** 먼저 `ollama pull <model>`을 실행하십시오.
- **Provider가 모델을 나열하지 않음.** 일부 provider(Fireworks)는 다른 이름 형식을 사용합니다. 마법사가 일반적인 패턴을 정규화하지만 특이한 모델 ID는 일치하지 않을 수 있습니다.
