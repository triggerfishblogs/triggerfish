# 음성 파이프라인

<ComingSoon />

::: info 아래 나열된 STT 및 TTS 제공자는 인터페이스 전용 스텁입니다. 제공자 인터페이스는 정의되어 있지만 구현은 아직 실제 음성 서비스에 연결되지 않았습니다. :::

Triggerfish는 macOS, iOS, Android에서 웨이크 워드 감지, 푸시 투 토크, 텍스트 음성 변환 응답을 포함한 음성 상호 작용을 지원합니다.

## 아키텍처

<img src="/diagrams/voice-pipeline.svg" alt="음성 파이프라인: 웨이크 워드 감지 → STT → 에이전트 처리 → TTS → 음성 출력" style="max-width: 100%;" />

오디오는 텍스트와 동일한 에이전트 처리 파이프라인을 통해 흐릅니다. 음성 입력이 전사되고 분류된 메시지로 세션에 진입하며 정책 hook을 통과하고 응답이 다시 음성으로 합성됩니다.

## 음성 모드

| 모드         | 설명                                        | 플랫폼                         |
| ------------ | ------------------------------------------- | ------------------------------ |
| Voice Wake   | 구성 가능한 웨이크 워드에 대한 상시 수신    | macOS, iOS, Android            |
| Push-to-Talk | 버튼 또는 키보드 단축키를 통한 수동 활성화  | macOS (메뉴 바), iOS, Android  |
| Talk Mode    | 연속 대화 음성                              | 모든 플랫폼                    |

## STT 제공자

음성 인식(Speech-to-Text)은 에이전트가 처리할 수 있도록 음성을 텍스트로 변환합니다.

| 제공자             | 유형  | 비고                                                             |
| ------------------ | ----- | ---------------------------------------------------------------- |
| Whisper            | 로컬  | 기본값. 기기에서 실행, 클라우드 종속성 없음. 개인 정보 보호에 최적. |
| Deepgram           | 클라우드 | 저지연 스트리밍 전사.                                          |
| OpenAI Whisper API | 클라우드 | 높은 정확도, API 키 필요.                                      |

## TTS 제공자

텍스트 음성 변환(Text-to-Speech)은 에이전트 응답을 음성 오디오로 변환합니다.

| 제공자        | 유형  | 비고                                                          |
| ------------- | ----- | ------------------------------------------------------------- |
| ElevenLabs    | 클라우드 | 기본값. 음성 복제 옵션이 있는 자연스러운 음성.              |
| OpenAI TTS    | 클라우드 | 고품질, 여러 음성 옵션.                                     |
| System Voices | 로컬  | OS 네이티브 음성. 클라우드 종속성 없음.                       |

## 제공자 레지스트리

Triggerfish는 STT와 TTS 모두에 대해 제공자 레지스트리 패턴을 사용합니다. 해당 인터페이스를 구현하여 호환 가능한 모든 제공자를 연결할 수 있습니다:

```typescript
interface SttProvider {
  transcribe(audio: Uint8Array, options?: SttOptions): Promise<string>;
}

interface TtsProvider {
  synthesize(text: string, options?: TtsOptions): Promise<Uint8Array>;
}
```

## 구성

`triggerfish.yaml`에서 음성 설정을 구성합니다:

```yaml
voice:
  stt:
    provider: whisper # whisper | deepgram | openai
    model: base # Whisper 모델 크기 (tiny, base, small, medium, large)
  tts:
    provider: elevenlabs # elevenlabs | openai | system
    voice_id: "your-voice" # 제공자별 음성 식별자
  wake_word: "triggerfish" # 사용자 정의 웨이크 워드
  push_to_talk:
    shortcut: "Ctrl+Space" # 키보드 단축키 (macOS)
```

## 보안 연동

음성 데이터는 텍스트와 동일한 분류 규칙을 따릅니다:

- **음성 입력은 텍스트 입력과 동일하게 분류됩니다.** 전사된 음성은 세션에 진입하며 타이핑된 메시지와 마찬가지로 taint를 상승시킬 수 있습니다.
- **TTS 출력은 합성 전 PRE_OUTPUT hook을 통과합니다.** 정책 엔진이 응답을 차단하면 절대 음성으로 출력되지 않습니다.
- **음성 세션은 taint를 가집니다.** 텍스트 세션과 마찬가지입니다. 세션 중간에 음성으로 전환해도 taint가 초기화되지 않습니다.
- **웨이크 워드 감지는 로컬에서 실행됩니다.** 웨이크 워드 매칭을 위해 클라우드로 오디오가 전송되지 않습니다.
- **오디오 녹음**(유지되는 경우)은 캡처 시 세션의 taint 수준으로 분류됩니다.

::: info 음성 파이프라인은 iOS 및 Android의 Buoy 컴패니언 앱과 통합되어 모바일 기기에서 푸시 투 토크와 음성 웨이크를 가능하게 합니다. Buoy는 아직 사용할 수 없습니다. :::
