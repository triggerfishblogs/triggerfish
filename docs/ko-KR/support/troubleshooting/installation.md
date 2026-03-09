# 문제 해결: 설치

## 바이너리 설치 프로그램 문제

### 체크섬 검증 실패

설치 프로그램은 바이너리와 함께 `SHA256SUMS.txt` 파일을 다운로드하고 설치 전에 해시를 검증합니다. 이것이 실패하면:

- **네트워크가 다운로드를 중단했습니다.** 부분 다운로드를 삭제하고 다시 시도하십시오.
- **미러 또는 CDN이 오래된 콘텐츠를 제공했습니다.** 몇 분 기다린 후 재시도하십시오. 설치 프로그램은 GitHub Releases에서 가져옵니다.
- **SHA256SUMS.txt에서 asset을 찾을 수 없습니다.** 이는 릴리스가 해당 플랫폼의 체크섬 없이 게시되었음을 의미합니다. [GitHub issue](https://github.com/greghavens/triggerfish/issues)를 작성하십시오.

설치 프로그램은 Linux에서 `sha256sum`을, macOS에서 `shasum -a 256`을 사용합니다. 둘 다 사용할 수 없으면 다운로드를 검증할 수 없습니다.

### `/usr/local/bin`에 쓰기 권한 거부

설치 프로그램은 먼저 `/usr/local/bin`을 시도한 후 `~/.local/bin`으로 대체합니다. 둘 다 작동하지 않는 경우:

```bash
# 옵션 1: 시스템 전체 설치를 위해 sudo로 실행
sudo bash -c "$(curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh)"

# 옵션 2: ~/.local/bin 생성 및 PATH에 추가
mkdir -p ~/.local/bin
export PATH="$HOME/.local/bin:$PATH"
# 그런 다음 설치 프로그램을 다시 실행
```

### macOS 격리 경고

macOS는 인터넷에서 다운로드한 바이너리를 차단합니다. 설치 프로그램은 격리 속성을 제거하기 위해 `xattr -cr`을 실행하지만, 바이너리를 수동으로 다운로드한 경우 다음을 실행하십시오:

```bash
xattr -cr /usr/local/bin/triggerfish
```

또는 Finder에서 바이너리를 마우스 오른쪽 버튼으로 클릭하고 "열기"를 선택한 다음 보안 프롬프트를 확인하십시오.

### 설치 후 PATH가 업데이트되지 않음

설치 프로그램은 설치 디렉토리를 셸 프로필(`.zshrc`, `.bashrc` 또는 `.bash_profile`)에 추가합니다. 설치 후 `triggerfish` 명령을 찾을 수 없는 경우:

1. 새 터미널 창을 여십시오 (현재 셸은 프로필 변경 사항을 반영하지 않습니다)
2. 또는 프로필을 수동으로 소싱하십시오: `source ~/.zshrc` (또는 셸이 사용하는 프로필 파일)

설치 프로그램이 PATH 업데이트를 건너뛴 경우, 설치 디렉토리가 이미 PATH에 있음을 의미합니다.

---

## 소스에서 빌드

### Deno를 찾을 수 없음

소스 빌드 설치 프로그램(`deploy/scripts/install-from-source.sh`)은 Deno가 없으면 자동으로 설치합니다. 이것이 실패하면:

```bash
# Deno 수동 설치
curl -fsSL https://deno.land/install.sh | sh

# 확인
deno --version   # 2.x여야 합니다
```

### 권한 오류로 컴파일 실패

`deno compile` 명령은 컴파일된 바이너리가 전체 시스템 액세스(네트워크, 파일 시스템, SQLite용 FFI, 서브프로세스 생성)를 필요로 하기 때문에 `--allow-all`이 필요합니다. 컴파일 중 권한 오류가 발생하면 대상 디렉토리에 대한 쓰기 액세스 권한이 있는 사용자로 설치 스크립트를 실행하고 있는지 확인하십시오.

### 특정 브랜치 또는 버전

특정 브랜치를 클론하려면 `TRIGGERFISH_BRANCH`를 설정하십시오:

```bash
TRIGGERFISH_BRANCH=feat/my-feature bash deploy/scripts/install-from-source.sh
```

바이너리 설치 프로그램의 경우 `TRIGGERFISH_VERSION`을 설정하십시오:

```bash
TRIGGERFISH_VERSION=v0.4.0 bash scripts/install.sh
```

---

## Windows 관련 문제

### PowerShell 실행 정책이 설치 프로그램을 차단함

관리자 권한으로 PowerShell을 실행하고 스크립트 실행을 허용하십시오:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

그런 다음 설치 프로그램을 다시 실행하십시오.

### Windows 서비스 컴파일 실패

Windows 설치 프로그램은 .NET Framework 4.x의 `csc.exe`를 사용하여 C# 서비스 래퍼를 즉석에서 컴파일합니다. 컴파일이 실패하면:

1. **.NET Framework가 설치되어 있는지 확인하십시오.** 명령 프롬프트에서 `where csc.exe`를 실행하십시오. 설치 프로그램은 `%WINDIR%\Microsoft.NET\Framework64\` 아래의 .NET Framework 디렉토리에서 찾습니다.
2. **관리자 권한으로 실행하십시오.** 서비스 설치에는 관리자 권한이 필요합니다.
3. **대안.** 서비스 컴파일이 실패하면 Triggerfish를 수동으로 실행할 수 있습니다: `triggerfish run` (포그라운드 모드). 터미널을 열어 두어야 합니다.

### 업그레이드 중 `Move-Item` 실패

이전 버전의 Windows 설치 프로그램은 대상 바이너리가 사용 중일 때 실패하는 `Move-Item -Force`를 사용했습니다. 이 문제는 버전 0.3.4 이상에서 수정되었습니다. 이전 버전에서 이 문제가 발생하면 먼저 서비스를 수동으로 중지하십시오:

```powershell
Stop-Service Triggerfish
# 그런 다음 설치 프로그램을 다시 실행
```

---

## Docker 문제

### 컨테이너가 즉시 종료됨

컨테이너 로그를 확인하십시오:

```bash
docker logs triggerfish
```

일반적인 원인:

- **구성 파일 누락.** `triggerfish.yaml`을 `/data/`에 마운트하십시오:
  ```bash
  docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
  ```
- **포트 충돌.** 포트 18789 또는 18790이 사용 중이면 gateway를 시작할 수 없습니다.
- **볼륨 권한 거부.** 컨테이너는 UID 65534(nonroot)로 실행됩니다. 해당 사용자가 볼륨에 쓸 수 있는지 확인하십시오.

### 호스트에서 Triggerfish에 액세스할 수 없음

Gateway는 기본적으로 컨테이너 내부의 `127.0.0.1`에 바인딩됩니다. 호스트에서 액세스하려면 Docker compose 파일이 포트 `18789`와 `18790`을 매핑합니다. `docker run`을 직접 사용하는 경우 다음을 추가하십시오:

```bash
-p 18789:18789 -p 18790:18790
```

### Docker 대신 Podman

Docker 설치 스크립트는 `podman`을 컨테이너 런타임으로 자동 감지합니다. 명시적으로 설정할 수도 있습니다:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman bash deploy/docker/install.sh
```

Docker 설치 프로그램이 설치한 `triggerfish` 래퍼 스크립트도 podman을 자동 감지합니다.

### 사용자 정의 이미지 또는 레지스트리

`TRIGGERFISH_IMAGE`로 이미지를 재정의하십시오:

```bash
TRIGGERFISH_IMAGE=my-registry.example.com/triggerfish:custom docker compose up -d
```

---

## 설치 후

### 설정 마법사가 시작되지 않음

바이너리 설치 후 설치 프로그램은 `triggerfish dive --install-daemon`을 실행하여 설정 마법사를 시작합니다. 시작되지 않으면:

1. 수동으로 실행하십시오: `triggerfish dive`
2. "Terminal requirement not met"이 표시되면 마법사에는 대화형 TTY가 필요합니다. SSH 세션, CI 파이프라인 및 파이프된 입력은 작동하지 않습니다. 대신 `triggerfish.yaml`을 수동으로 구성하십시오.

### Signal 채널 자동 설치 실패

Signal에는 Java 애플리케이션인 `signal-cli`가 필요합니다. 자동 설치 프로그램은 미리 빌드된 `signal-cli` 바이너리와 JRE 25 런타임을 다운로드합니다. 다음과 같은 경우 실패할 수 있습니다:

- **설치 디렉토리에 쓰기 권한이 없음.** `~/.triggerfish/signal-cli/`의 권한을 확인하십시오.
- **JRE 다운로드 실패.** 설치 프로그램은 Adoptium에서 가져옵니다. 네트워크 제한 또는 기업 프록시가 이를 차단할 수 있습니다.
- **아키텍처 미지원.** JRE 자동 설치는 x64 및 aarch64만 지원합니다.

자동 설치가 실패하면 `signal-cli`를 수동으로 설치하고 PATH에 있는지 확인하십시오. 수동 설정 단계는 [Signal 채널 문서](/channels/signal)를 참조하십시오.
