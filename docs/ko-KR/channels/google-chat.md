# Google Chat

<ComingSoon />

Google Workspace를 사용하는 팀이 채팅 인터페이스에서 직접 상호 작용할 수
있도록 Triggerfish 에이전트를 Google Chat에 연결합니다. 어댑터는 서비스
계정 또는 OAuth 자격 증명을 사용하여 Google Chat API를 사용할 것입니다.

## 계획된 기능

- 다이렉트 메시지 및 스페이스(룸) 지원
- Google Workspace 디렉토리를 통한 소유자 확인
- 타이핑 인디케이터
- 긴 응답에 대한 메시지 청킹
- 다른 채널과 일관된 분류 적용

## 구성 (계획됨)

```yaml
channels:
  google-chat:
    classification: INTERNAL
```

기존 Google 통합에 대해서는 Gmail, Calendar, Tasks, Drive 및 Sheets를
다루는 [Google Workspace](/ko-KR/integrations/google-workspace)를
참조하십시오.
