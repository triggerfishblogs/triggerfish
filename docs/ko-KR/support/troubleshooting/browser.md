# 문제 해결: 브라우저 자동화

## Chrome / Chromium을 찾을 수 없음

Triggerfish는 puppeteer-core(번들된 Chromium이 아님)를 사용하며 시스템에서 Chrome 또는 Chromium을 자동 감지합니다. 브라우저를 찾을 수 없으면 브라우저 도구가 실행 오류와 함께 실패합니다.

### 플랫폼별 감지 경로

**Linux:**
- `/usr/bin/chromium`
- `/usr/bin/chromium-browser`
- `/usr/bin/google-chrome`
- `/usr/bin/google-chrome-stable`
- `/snap/bin/chromium`
- `/usr/bin/brave`
- `/usr/bin/brave-browser`
- Flatpak: `com.google.Chrome`, `org.chromium.Chromium`, `com.brave.Browser`

**macOS:**
- `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- `/Applications/Brave Browser.app/Contents/MacOS/Brave Browser`
- `/Applications/Chromium.app/Contents/MacOS/Chromium`

**Windows:**
- `%PROGRAMFILES%\Google\Chrome\Application\chrome.exe`
- `%PROGRAMFILES(X86)%\Google\Chrome\Application\chrome.exe`
- `%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe`

### 브라우저 설치

```bash
# Debian/Ubuntu
sudo apt install chromium-browser

# Fedora
sudo dnf install chromium

# macOS
brew install --cask google-chrome

# 또는 자동 감지되는 Brave를 설치
```

### 수동 경로 재정의

브라우저가 비표준 위치에 설치된 경우 경로를 설정할 수 있습니다. 정확한 구성 키는 프로젝트에 문의하십시오(현재 브라우저 관리자 구성을 통해 설정됩니다).

---

## 실행 실패

### "Direct Chrome process launch failed"

Triggerfish는 `Deno.Command`를 통해 headless 모드로 Chrome을 실행합니다. 프로세스가 시작에 실패하면:

1. **바이너리가 실행 가능하지 않음.** 파일 권한을 확인하십시오.
2. **공유 라이브러리 누락.** 최소 Linux 설치(컨테이너, WSL)에서 Chrome에 추가 라이브러리가 필요할 수 있습니다:
   ```bash
   # Debian/Ubuntu
   sudo apt install libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxcomposite1 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2
   ```
3. **디스플레이 서버 없음.** Chrome headless는 X11/Wayland가 필요하지 않지만, 일부 Chrome 버전은 여전히 디스플레이 관련 라이브러리를 로드하려고 합니다.

### Flatpak Chrome

Chrome이 Flatpak 패키지로 설치된 경우, Triggerfish는 적절한 인수로 `flatpak run`을 호출하는 래퍼 스크립트를 생성합니다.

```
Flatpak wrapper script file write failed
Flatpak Chrome process launch failed
Flatpak Chrome launch failed
```

래퍼 스크립트가 실패하면:
- `/usr/bin/flatpak` 또는 `/usr/local/bin/flatpak`이 존재하는지 확인하십시오
- Flatpak 앱 ID가 올바른지 확인하십시오(`flatpak list`를 실행하여 설치된 앱을 확인)
- 래퍼 스크립트는 임시 디렉토리에 기록됩니다. 임시 디렉토리에 쓸 수 없으면 쓰기가 실패합니다.

### CDP 엔드포인트 미준비

Chrome을 실행한 후, Triggerfish는 Chrome DevTools Protocol(CDP) 엔드포인트를 폴링하여 연결을 설정합니다. 기본 타임아웃은 200ms 폴링 간격으로 30초입니다.

```
CDP endpoint on port <port> not ready after <timeout>ms
```

이는 Chrome이 시작되었지만 시간 내에 CDP 포트를 열지 못했음을 의미합니다. 원인:
- Chrome이 느리게 로딩됨(리소스가 제한된 시스템)
- 다른 Chrome 인스턴스가 동일한 디버깅 포트를 사용 중
- Chrome이 시작 중 충돌(Chrome 자체 출력 확인)

---

## 내비게이션 문제

### "Navigation blocked by domain policy"

브라우저 도구는 web_fetch와 동일한 SSRF 보호를 적용합니다. 사설 IP 주소를 가리키는 URL은 차단됩니다:

```
Navigation blocked by domain policy: http://192.168.1.1/admin
```

이것은 의도된 보안 적용입니다. 브라우저는 다음에 접근할 수 없습니다:
- `localhost` / `127.0.0.1`
- 사설 네트워크 (`10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`)
- 링크 로컬 주소 (`169.254.x.x`)

이 검사를 비활성화할 방법은 없습니다.

### "Invalid URL"

URL이 잘못되었습니다. 브라우저 내비게이션에는 프로토콜이 포함된 전체 URL이 필요합니다:

```
# 잘못됨
browser_navigate google.com

# 올바름
browser_navigate https://google.com
```

### 내비게이션 타임아웃

```
Navigation failed: Timeout
```

페이지 로드에 너무 오래 걸렸습니다. 일반적으로 느린 서버이거나 로딩이 완료되지 않는 페이지(무한 리디렉션, 멈춘 JavaScript)입니다.

---

## 페이지 상호작용 문제

### "Click failed", "Type failed", "Select failed"

이러한 오류에는 실패한 CSS 선택자가 포함됩니다:

```
Click failed on ".submit-button": Node not found
Type failed on "#email": Node not found
```

선택자가 페이지의 어떤 요소와도 일치하지 않았습니다. 일반적인 원인:
- 페이지가 아직 로딩을 완료하지 않음
- 요소가 iframe 내부에 있음(선택자는 iframe 경계를 넘지 않음)
- 선택자가 잘못됨(동적 클래스 이름, shadow DOM)

### "Snapshot failed"

페이지 스냅샷(컨텍스트를 위한 DOM 추출)이 실패했습니다. 다음과 같은 경우에 발생할 수 있습니다:
- 페이지에 콘텐츠가 없음(빈 페이지)
- JavaScript 오류가 DOM 액세스를 방해함
- 스냅샷 캡처 중 페이지가 이동함

### "Scroll failed"

일반적으로 사용자 정의 스크롤 컨테이너가 있는 페이지에서 발생합니다. 스크롤 명령은 기본 문서 뷰포트를 대상으로 합니다.

---

## 프로필 격리

브라우저 프로필은 에이전트별로 격리됩니다. 각 에이전트는 프로필 기본 디렉토리 아래에 자체 Chrome 프로필 디렉토리를 가집니다. 이는 다음을 의미합니다:

- 로그인 세션은 에이전트 간에 공유되지 않음
- 쿠키, 로컬 스토리지, 캐시는 에이전트별
- Classification 인식 접근 제어가 교차 오염을 방지

예기치 않은 프로필 동작이 발생하면 프로필 디렉토리가 손상되었을 수 있습니다. 이를 삭제하면 다음 브라우저 실행 시 Triggerfish가 새 프로필을 생성합니다.
