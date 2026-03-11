# KB: 자체 업데이트 프로세스

`triggerfish update`의 작동 방식, 발생 가능한 문제 및 복구 방법입니다.

## 작동 방식

업데이트 명령은 GitHub에서 최신 릴리스를 다운로드하고 설치합니다:

1. **버전 확인.** GitHub API에서 최신 릴리스 태그를 가져옵니다. 이미 최신 버전인 경우 조기 종료합니다:
   ```
   Already up to date (v0.4.2)
   ```
   개발 빌드(`VERSION=dev`)는 버전 확인을 건너뛰고 항상 진행합니다.

2. **플랫폼 감지.** OS와 아키텍처에 따라 올바른 바이너리 asset 이름을 결정합니다(linux-x64, linux-arm64, macos-x64, macos-arm64, windows-x64).

3. **다운로드.** GitHub 릴리스에서 바이너리와 `SHA256SUMS.txt`를 가져옵니다.

4. **체크섬 검증.** 다운로드된 바이너리의 SHA256을 계산하고 `SHA256SUMS.txt`의 항목과 비교합니다. 체크섬이 일치하지 않으면 업데이트가 중단됩니다.

5. **Daemon 중지.** 바이너리를 교체하기 전에 실행 중인 daemon을 중지합니다.

6. **바이너리 교체.** 플랫폼별:
   - **Linux/macOS:** 이전 바이너리 이름 변경, 새 바이너리를 원래 위치로 이동
   - **macOS 추가 단계:** `xattr -cr`로 격리 속성 제거
   - **Windows:** 이전 바이너리를 `.old`로 이름 변경(Windows는 실행 중인 실행 파일을 덮어쓸 수 없음), 새 바이너리를 원래 경로에 복사

7. **Daemon 재시작.** 새 바이너리로 daemon을 시작합니다.

8. **변경 로그.** 새 버전의 릴리스 노트를 가져와 표시합니다.

## Sudo 에스컬레이션

바이너리가 root 액세스가 필요한 디렉토리(예: `/usr/local/bin`)에 설치된 경우, 업데이터가 `sudo`로 에스컬레이션하기 위해 비밀번호를 입력하라는 프롬프트를 표시합니다.

## 파일 시스템 간 이동

다운로드 디렉토리와 설치 디렉토리가 다른 파일 시스템에 있는 경우(별도의 파티션에 `/tmp`가 있는 경우 흔함) 원자적 이름 변경이 실패합니다. 업데이터는 복사 후 삭제로 대체되며, 이는 안전하지만 잠시 두 바이너리가 디스크에 존재합니다.

## 발생 가능한 문제

### "Checksum verification exception"

다운로드된 바이너리가 예상 해시와 일치하지 않습니다. 일반적으로 다음을 의미합니다:
- 다운로드가 손상됨(네트워크 문제)
- 릴리스 asset이 오래되었거나 부분적으로 업로드됨

**해결 방법:** 몇 분 기다린 후 다시 시도하십시오. 지속되면 [릴리스 페이지](https://github.com/greghavens/triggerfish/releases)에서 바이너리를 수동으로 다운로드하십시오.

### "Asset not found in SHA256SUMS.txt"

릴리스가 해당 플랫폼의 체크섬 없이 게시되었습니다. 릴리스 파이프라인 문제입니다.

**해결 방법:** [GitHub issue](https://github.com/greghavens/triggerfish/issues)를 작성하십시오.

### "Binary replacement failed"

업데이터가 이전 바이너리를 새 것으로 교체할 수 없었습니다. 일반적인 원인:
- 파일 권한(바이너리가 root 소유이지만 일반 사용자로 실행 중)
- 파일이 잠김(Windows: 다른 프로세스가 바이너리를 열어 둠)
- 읽기 전용 파일 시스템

**해결 방법:**
1. 수동으로 daemon을 중지하십시오: `triggerfish stop`
2. 오래된 프로세스를 종료하십시오
3. 적절한 권한으로 업데이트를 다시 시도하십시오

### "Checksum file download failed"

GitHub 릴리스에서 `SHA256SUMS.txt`를 다운로드할 수 없습니다. 네트워크 연결을 확인하고 다시 시도하십시오.

### Windows `.old` 파일 정리

Windows 업데이트 후 이전 바이너리는 `triggerfish.exe.old`로 이름이 변경됩니다. 이 파일은 다음 시작 시 자동으로 정리됩니다. 정리되지 않으면(예: 새 바이너리가 시작 시 충돌하는 경우) 수동으로 삭제할 수 있습니다.

## 버전 비교

업데이터는 시맨틱 버저닝 비교를 사용합니다:
- 선행 `v` 접두사를 제거합니다(`v0.4.2`와 `0.4.2` 모두 허용)
- major, minor, patch를 숫자로 비교합니다
- 프리릴리스 버전이 처리됩니다(예: `v0.4.2-rc.1`)

## 수동 업데이트

자동 업데이터가 작동하지 않는 경우:

1. [GitHub Releases](https://github.com/greghavens/triggerfish/releases)에서 플랫폼용 바이너리를 다운로드하십시오
2. Daemon을 중지하십시오: `triggerfish stop`
3. 바이너리를 교체하십시오:
   ```bash
   # Linux/macOS
   sudo cp triggerfish-linux-x64 /usr/local/bin/triggerfish
   sudo chmod +x /usr/local/bin/triggerfish

   # macOS: 격리 제거
   xattr -cr /usr/local/bin/triggerfish
   ```
4. Daemon을 시작하십시오: `triggerfish start`

## Docker 업데이트

Docker 배포는 바이너리 업데이터를 사용하지 않습니다. 컨테이너 이미지를 업데이트하십시오:

```bash
# 래퍼 스크립트 사용
triggerfish update

# 수동
docker compose pull
docker compose up -d
```

래퍼 스크립트는 최신 이미지를 pull하고 실행 중인 컨테이너가 있으면 재시작합니다.

## 변경 로그

업데이트 후 릴리스 노트가 자동으로 표시됩니다. 수동으로도 볼 수 있습니다:

```bash
triggerfish changelog              # 현재 버전
triggerfish changelog --latest 5   # 최근 5개 릴리스
```

업데이트 후 변경 로그 가져오기가 실패하면 로그되지만 업데이트 자체에는 영향을 미치지 않습니다.
