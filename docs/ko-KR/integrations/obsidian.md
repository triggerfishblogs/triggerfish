# Obsidian

Triggerfish 에이전트를 하나 이상의 [Obsidian](https://obsidian.md/) vault에 연결하여 노트를 읽고, 생성하고, 검색할 수 있습니다. 이 통합은 파일시스템에서 직접 vault에 접근합니다 -- Obsidian 앱이나 플러그인이 필요하지 않습니다.

## 기능

Obsidian 통합은 에이전트에게 다음 도구를 제공합니다:

| 도구              | 설명                              |
| ----------------- | --------------------------------- |
| `obsidian_read`   | 노트의 내용과 프론트매터 읽기     |
| `obsidian_write`  | 노트 생성 또는 업데이트           |
| `obsidian_list`   | 폴더의 노트 나열                  |
| `obsidian_search` | 노트 내용 검색                    |
| `obsidian_daily`  | 오늘의 일일 노트 읽기 또는 생성   |
| `obsidian_links`  | 위키링크 해석 및 백링크 찾기      |
| `obsidian_delete` | 노트 삭제                         |

## 설정

### 1단계: Vault 연결

```bash
triggerfish connect obsidian
```

이 명령은 vault 경로를 요청하고 구성을 작성합니다. 수동으로 구성할 수도 있습니다.

### 2단계: triggerfish.yaml에서 구성

```yaml
obsidian:
  vaults:
    main:
      vaultPath: ~/Obsidian/MainVault
      defaultClassification: INTERNAL
      excludeFolders:
        - .obsidian
        - .trash
      folderClassifications:
        "Private/Health": CONFIDENTIAL
        "Private/Finance": RESTRICTED
        "Work": INTERNAL
        "Public": PUBLIC
```

| 옵션                    | 유형     | 필수   | 설명                                                  |
| ----------------------- | -------- | ------ | ----------------------------------------------------- |
| `vaultPath`             | string   | 예     | Obsidian vault 루트의 절대 경로                       |
| `defaultClassification` | string   | 아니오 | 노트의 기본 분류 (기본값: `INTERNAL`)                 |
| `excludeFolders`        | string[] | 아니오 | 무시할 폴더 (기본값: `.obsidian`, `.trash`)           |
| `folderClassifications` | object   | 아니오 | 폴더 경로를 분류 수준에 매핑                          |

### 다중 Vault

다른 분류 수준으로 여러 vault를 연결할 수 있습니다:

```yaml
obsidian:
  vaults:
    personal:
      vaultPath: ~/Obsidian/Personal
      defaultClassification: CONFIDENTIAL
    work:
      vaultPath: ~/Obsidian/Work
      defaultClassification: INTERNAL
    public:
      vaultPath: ~/Obsidian/PublicNotes
      defaultClassification: PUBLIC
```

## 폴더 기반 분류

노트는 폴더에서 분류를 상속합니다. 가장 구체적으로 일치하는 폴더가 우선합니다:

```yaml
folderClassifications:
  "Private": CONFIDENTIAL
  "Private/Health": RESTRICTED
  "Work": INTERNAL
```

이 구성으로:

- `Private/todo.md`는 `CONFIDENTIAL`
- `Private/Health/records.md`는 `RESTRICTED`
- `Work/project.md`는 `INTERNAL`
- `notes.md` (vault 루트)는 `defaultClassification` 사용

분류 게이팅이 적용됩니다: 에이전트는 분류 수준이 현재 세션 taint로 흐를 수 있는 노트만 읽을 수 있습니다. `PUBLIC`으로 taint된 세션은 `CONFIDENTIAL` 노트에 접근할 수 없습니다.

## 보안

### 경로 제한

모든 파일 작업은 vault 루트로 제한됩니다. 어댑터는 `Deno.realPath`를 사용하여 심볼릭 링크를 해석하고 경로 탐색 공격을 방지합니다. `../../etc/passwd` 또는 유사한 접근 시도는 파일시스템에 접근하기 전에 차단됩니다.

### Vault 검증

어댑터는 경로를 수락하기 전에 vault 루트에 `.obsidian/` 디렉터리가 존재하는지 확인합니다. 이는 임의의 디렉터리가 아닌 실제 Obsidian vault를 가리키고 있는지 확인합니다.

### 분류 시행

- 노트는 폴더 매핑에서 분류를 가집니다
- `CONFIDENTIAL` 노트를 읽으면 세션 taint가 `CONFIDENTIAL`로 상승합니다
- No-write-down 규칙은 분류된 콘텐츠를 더 낮은 분류의 폴더에 쓰는 것을 방지합니다
- 모든 노트 작업은 표준 정책 hook을 통과합니다

## 위키링크

어댑터는 Obsidian의 `[[wikilink]]` 구문을 이해합니다. `obsidian_links` 도구는 위키링크를 실제 파일 경로로 해석하고 특정 노트에 연결하는 모든 노트를 찾습니다(백링크).

## 일일 노트

`obsidian_daily` 도구는 vault의 일일 노트 폴더 규칙을 사용하여 오늘의 일일 노트를 읽거나 생성합니다. 노트가 존재하지 않으면 기본 템플릿으로 생성합니다.

## 프론트매터

YAML 프론트매터가 있는 노트는 자동으로 파싱됩니다. 프론트매터 필드는 노트를 읽을 때 메타데이터로 사용할 수 있습니다. 어댑터는 노트를 작성하거나 업데이트할 때 프론트매터를 보존합니다.
