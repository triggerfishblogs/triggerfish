# Google Workspace

Google 계정을 연결하여 에이전트에게 Gmail, Calendar, Tasks, Drive, Sheets에 대한 접근을 제공합니다.

## 전제 조건

- Google 계정
- OAuth 자격 증명이 있는 Google Cloud 프로젝트

## 설정

### 1단계: Google Cloud 프로젝트 생성

1. [Google Cloud Console](https://console.cloud.google.com/)로 이동합니다
2. 상단의 프로젝트 드롭다운을 클릭하고 **New Project**를 선택합니다
3. "Triggerfish"(또는 원하는 이름)로 이름을 지정하고 **Create**를 클릭합니다

### 2단계: API 활성화

프로젝트에서 다음 API를 각각 활성화합니다:

- [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
- [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
- [Google Tasks API](https://console.cloud.google.com/apis/library/tasks.googleapis.com)
- [Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com)
- [Google Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com)

각 페이지에서 **Enable**을 클릭합니다. 프로젝트당 한 번만 수행하면 됩니다.

### 3단계: OAuth 동의 화면 구성

자격 증명을 생성하기 전에 Google은 OAuth 동의 화면을 요구합니다. 이것은 사용자가 접근을 허가할 때 보는 화면입니다.

1. [OAuth 동의 화면](https://console.cloud.google.com/apis/credentials/consent)으로 이동합니다
2. 사용자 유형: **External**(또는 Google Workspace 조직에 속해 있고 조직 사용자만 원하는 경우 **Internal**)을 선택합니다
3. **Create**를 클릭합니다
4. 필수 필드를 작성합니다:
   - **App name**: "Triggerfish" (또는 원하는 이름)
   - **User support email**: 본인의 이메일 주소
   - **Developer contact email**: 본인의 이메일 주소
5. **Save and Continue**를 클릭합니다
6. **Scopes** 화면에서 **Add or Remove Scopes**를 클릭하고 추가합니다:
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/tasks`
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/spreadsheets`
7. **Update**를 클릭한 다음 **Save and Continue**를 클릭합니다
8. **Audience** 페이지(왼쪽 사이드바의 "OAuth consent screen" 아래)로 이동합니다 -- 여기에서 **Test users** 섹션을 찾을 수 있습니다
9. **+ Add Users**를 클릭하고 본인의 Google 이메일 주소를 추가합니다
10. **Save and Continue**를 클릭한 다음 **Back to Dashboard**를 클릭합니다

::: warning 앱이 "Testing" 상태인 동안에는 추가한 테스트 사용자만 인증할 수 있습니다. 개인 사용에는 이것으로 충분합니다. 앱을 게시하면 테스트 사용자 제한이 제거되지만 Google 검증이 필요합니다. :::

### 4단계: OAuth 자격 증명 생성

1. [Credentials](https://console.cloud.google.com/apis/credentials)로 이동합니다
2. 상단에서 **+ CREATE CREDENTIALS**를 클릭합니다
3. **OAuth client ID**를 선택합니다
4. 애플리케이션 유형: **Desktop app**
5. 이름: "Triggerfish" (또는 원하는 이름)
6. **Create**를 클릭합니다
7. **Client ID**와 **Client Secret**을 복사합니다

### 5단계: 연결

```bash
triggerfish connect google
```

다음이 요청됩니다:

1. **Client ID**
2. **Client Secret**

접근을 허가하기 위해 브라우저 창이 열립니다. 인증 후 토큰은 OS 키체인(macOS Keychain 또는 Linux libsecret)에 안전하게 저장됩니다. 구성 파일이나 환경 변수에 자격 증명이 저장되지 않습니다.

### 연결 해제

```bash
triggerfish disconnect google
```

키체인에서 모든 Google 토큰을 제거합니다. 언제든지 `connect`를 다시 실행하여 재연결할 수 있습니다.

## 사용 가능한 도구

연결 후 에이전트는 14개의 도구에 접근할 수 있습니다:

| 도구              | 설명                                                  |
| ----------------- | ----------------------------------------------------- |
| `gmail_search`    | 쿼리로 이메일 검색 (Gmail 검색 구문 지원)             |
| `gmail_read`      | ID로 특정 이메일 읽기                                 |
| `gmail_send`      | 이메일 작성 및 보내기                                 |
| `gmail_label`     | 메시지에 라벨 추가 또는 제거                          |
| `calendar_list`   | 다가오는 캘린더 이벤트 나열                           |
| `calendar_create` | 새 캘린더 이벤트 생성                                 |
| `calendar_update` | 기존 이벤트 업데이트                                  |
| `tasks_list`      | Google Tasks에서 작업 나열                            |
| `tasks_create`    | 새 작업 생성                                          |
| `tasks_complete`  | 작업을 완료로 표시                                    |
| `drive_search`    | Google Drive에서 파일 검색                            |
| `drive_read`      | 파일 내용 읽기 (Google Docs를 텍스트로 내보내기)      |
| `sheets_read`     | 스프레드시트에서 범위 읽기                            |
| `sheets_write`    | 스프레드시트 범위에 값 쓰기                           |

## 상호 작용 예시

에이전트에게 다음과 같은 것을 요청할 수 있습니다:

- "오늘 캘린더에 뭐가 있어?"
- "alice@example.com에서 온 이메일을 검색해줘"
- "bob@example.com에게 '회의 노트' 제목으로 이메일을 보내줘"
- "Drive에서 4분기 예산 스프레드시트를 찾아줘"
- "작업 목록에 '장 보기' 추가해줘"
- "Sales 스프레드시트에서 A1:D10 셀을 읽어줘"

## OAuth 스코프

Triggerfish는 인증 중 다음 스코프를 요청합니다:

| 스코프           | 접근 수준                                     |
| ---------------- | --------------------------------------------- |
| `gmail.modify`   | 이메일 및 라벨 읽기, 보내기, 관리             |
| `calendar`       | Google Calendar에 대한 전체 읽기/쓰기 접근    |
| `tasks`          | Google Tasks에 대한 전체 읽기/쓰기 접근       |
| `drive.readonly` | Google Drive 파일에 대한 읽기 전용 접근       |
| `spreadsheets`   | Google Sheets에 대한 읽기 및 쓰기 접근        |

::: tip Drive 접근은 읽기 전용입니다. Triggerfish는 파일을 검색하고 읽을 수 있지만 생성, 수정, 삭제할 수 없습니다. Sheets는 스프레드시트 셀 업데이트를 위한 별도의 쓰기 접근이 있습니다. :::

## 보안

- 모든 Google Workspace 데이터는 최소 **INTERNAL**로 분류됩니다
- 이메일 내용, 캘린더 세부 사항, 문서 내용은 일반적으로 **CONFIDENTIAL**입니다
- 토큰은 OS 키체인(macOS Keychain / Linux libsecret)에 저장됩니다
- 클라이언트 자격 증명은 키체인의 토큰과 함께 저장되며 환경 변수나 구성 파일에 저장되지 않습니다
- [No Write-Down 규칙](/ko-KR/security/no-write-down)이 적용됩니다: CONFIDENTIAL Google 데이터는 PUBLIC 채널로 흐를 수 없습니다
- 모든 도구 호출은 전체 분류 컨텍스트와 함께 감사 추적에 기록됩니다

## 문제 해결

### "No Google tokens found"

`triggerfish connect google`을 실행하여 인증합니다.

### "Google refresh token revoked or expired"

리프레시 토큰이 무효화되었습니다 (예: Google 계정 설정에서 접근을 취소). `triggerfish connect google`을 실행하여 재연결합니다.

### "Access blocked: has not completed the Google verification process"

Google 계정이 앱의 테스트 사용자로 등록되지 않았음을 의미합니다. 앱이 "Testing" 상태(기본값)인 동안에는 테스트 사용자로 명시적으로 추가된 계정만 인증할 수 있습니다.

1. [OAuth 동의 화면](https://console.cloud.google.com/apis/credentials/consent)으로 이동합니다
2. **Audience** 페이지(왼쪽 사이드바)로 이동합니다
3. **Test users** 섹션에서 **+ Add Users**를 클릭하고 Google 이메일 주소를 추가합니다
4. 저장하고 `triggerfish connect google`을 다시 시도합니다

### "Token exchange failed"

Client ID와 Client Secret을 다시 확인합니다. 다음을 확인하십시오:

- OAuth 클라이언트 유형이 "Desktop app"인지
- Google Cloud 프로젝트에서 모든 필수 API가 활성화되어 있는지
- Google 계정이 테스트 사용자로 등록되어 있는지 (앱이 테스트 모드인 경우)

### API가 활성화되지 않음

특정 서비스에 대해 403 오류가 표시되면 [Google Cloud Console API 라이브러리](https://console.cloud.google.com/apis/library)에서 해당 API가 활성화되어 있는지 확인합니다.
