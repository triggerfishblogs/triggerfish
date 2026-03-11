# 저장소

Triggerfish의 모든 상태 데이터는 통합 `StorageProvider` 추상화를 통해 흐릅니다. 어떤 모듈도 자체 저장 메커니즘을 생성하지 않습니다 -- 영속성이 필요한 모든 구성 요소는 `StorageProvider`를 종속성으로 받습니다. 이 설계는 비즈니스 로직을 건드리지 않고 백엔드를 교체할 수 있게 하며 모든 테스트를 빠르고 결정론적으로 유지합니다.

## StorageProvider 인터페이스

```typescript
interface StorageProvider {
  /** 키로 값을 검색합니다. 없으면 null을 반환합니다. */
  get(key: string): Promise<StorageValue | null>;

  /** 키에 값을 저장합니다. 기존 값을 덮어씁니다. */
  set(key: string, value: StorageValue): Promise<void>;

  /** 키를 삭제합니다. 키가 없으면 아무 동작도 하지 않습니다. */
  delete(key: string): Promise<void>;

  /** 선택적 접두사와 일치하는 모든 키를 나열합니다. */
  list(prefix?: string): Promise<string[]>;

  /** 모든 키를 삭제합니다. 주의하여 사용하십시오. */
  clear(): Promise<void>;
}
```

::: info `StorageValue`는 문자열입니다. 모든 구조화된 데이터(세션, 계보 레코드, 구성)는 저장 전에 JSON으로 직렬화되고 읽기 시 역직렬화됩니다. 이는 인터페이스를 단순하고 백엔드에 종속되지 않게 유지합니다. :::

## 구현

| 백엔드                  | 용도                        | 영속성                                             | 구성                            |
| ----------------------- | --------------------------- | -------------------------------------------------- | ------------------------------- |
| `MemoryStorageProvider` | 테스팅, 임시 세션           | 없음 (재시작 시 손실)                              | 구성 필요 없음                  |
| `SqliteStorageProvider` | 개인 티어 기본값            | `~/.triggerfish/data/triggerfish.db`의 SQLite WAL   | 제로 구성                       |
| 엔터프라이즈 백엔드     | 엔터프라이즈 티어           | 고객 관리                                          | Postgres, S3 또는 기타 백엔드   |

### MemoryStorageProvider

속도와 결정론성을 위해 모든 테스트에서 사용됩니다. 데이터는 메모리에만 존재하며 프로세스 종료 시 손실됩니다. 모든 테스트 스위트는 새로운 `MemoryStorageProvider`를 생성하여 테스트가 격리되고 재현 가능합니다.

### SqliteStorageProvider

개인 티어 배포의 기본값입니다. 동시 읽기 접근과 충돌 안전성을 위해 WAL(Write-Ahead Logging) 모드의 SQLite를 사용합니다. 데이터베이스 위치:

```
~/.triggerfish/data/triggerfish.db
```

SQLite는 구성, 서버 프로세스, 네트워크가 필요하지 않습니다. 단일 파일이 모든 Triggerfish 상태를 저장합니다. `@db/sqlite` Deno 패키지가 바인딩을 제공하며 `--allow-ffi` 권한이 필요합니다.

::: tip SQLite WAL 모드는 단일 기록자와 함께 여러 독자가 데이터베이스에 동시에 접근할 수 있게 합니다. 이는 에이전트가 도구 결과를 쓰는 동안 Gateway가 세션 상태를 읽을 수 있으므로 중요합니다. :::

### 엔터프라이즈 백엔드

엔터프라이즈 배포는 코드 변경 없이 외부 저장소 백엔드(Postgres, S3 등)를 연결할 수 있습니다. `StorageProvider` 인터페이스의 모든 구현이 작동합니다. 백엔드는 `triggerfish.yaml`에서 구성됩니다.

## 네임스페이스 키

저장소 시스템의 모든 키는 데이터 유형을 식별하는 접두사로 네임스페이스가 지정됩니다. 이는 충돌을 방지하고 카테고리별로 데이터를 쿼리, 유지 및 삭제할 수 있게 합니다.

| 네임스페이스     | 키 패턴                                      | 설명                                           |
| ---------------- | -------------------------------------------- | ---------------------------------------------- |
| `sessions:`      | `sessions:sess_abc123`                       | 세션 상태 (대화 기록, 메타데이터)              |
| `taint:`         | `taint:sess_abc123`                          | 세션 taint 수준                                |
| `lineage:`       | `lineage:lin_789xyz`                         | 데이터 계보 레코드 (출처 추적)                 |
| `audit:`         | `audit:2025-01-29T10:23:45Z:hook_pre_output` | 감사 로그 항목                                 |
| `cron:`          | `cron:job_daily_report`                      | Cron 작업 상태 및 실행 기록                    |
| `notifications:` | `notifications:notif_456`                    | 알림 대기열                                    |
| `exec:`          | `exec:run_789`                               | 에이전트 실행 환경 기록                        |
| `skills:`        | `skills:skill_weather`                       | 설치된 스킬 메타데이터                         |
| `config:`        | `config:v3`                                  | 구성 스냅샷                                    |

## 보존 정책

각 네임스페이스에는 기본 보존 정책이 있습니다. 엔터프라이즈 배포는 이를 사용자 정의할 수 있습니다.

| 네임스페이스     | 기본 보존                   | 근거                                       |
| ---------------- | --------------------------- | ------------------------------------------ |
| `sessions:`      | 30일                        | 대화 기록의 시효                           |
| `taint:`         | 세션 보존과 동일            | 세션 없이 taint는 의미 없음                |
| `lineage:`       | 90일                        | 컴플라이언스 기반, 감사 추적               |
| `audit:`         | 1년                         | 컴플라이언스 기반, 법적 및 규제            |
| `cron:`          | 30일                        | 디버깅을 위한 실행 기록                    |
| `notifications:` | 전달 후 + 7일               | 미전달 알림은 유지되어야 함                |
| `exec:`          | 30일                        | 디버깅을 위한 실행 아티팩트                |
| `skills:`        | 영구                        | 설치된 스킬 메타데이터는 만료되면 안 됨    |
| `config:`        | 10개 버전                   | 롤백을 위한 롤링 구성 기록                 |

## 설계 원칙

### 모든 모듈이 StorageProvider를 사용

Triggerfish의 어떤 모듈도 자체 저장 메커니즘을 생성하지 않습니다. 세션 관리, taint 추적, 계보 기록, 감사 로깅, cron 상태, 알림 대기열, 실행 기록, 구성 -- 모두 `StorageProvider`를 통해 흐릅니다.

이것은 다음을 의미합니다:

- 백엔드 교체에 하나의 종속성 주입 지점만 변경하면 됩니다
- 테스트는 속도를 위해 `MemoryStorageProvider`를 사용합니다 -- SQLite 설정 없음, 파일 시스템 없음
- 저장 시 암호화, 백업 또는 복제를 구현할 장소가 정확히 하나입니다

### 직렬화

모든 구조화된 데이터는 저장 전에 JSON 문자열로 직렬화됩니다. 직렬화/역직렬화 계층은 다음을 처리합니다:

- `Date` 객체 (`toISOString()`로 ISO 8601 문자열로 직렬화, `new Date()`로 역직렬화)
- 브랜드 타입 (기본 문자열 값으로 직렬화)
- 중첩 객체 및 배열

```typescript
// 세션 저장
const session = {
  id: "sess_abc",
  taint: "CONFIDENTIAL",
  createdAt: new Date(),
};
await storage.set("sessions:sess_abc", JSON.stringify(session));

// 세션 검색
const raw = await storage.get("sessions:sess_abc");
if (raw) {
  const session = JSON.parse(raw);
  session.createdAt = new Date(session.createdAt); // Date 복원
}
```

### 불변성

세션 작업은 불변입니다. 세션을 읽고, 수정하고, 다시 쓰면 항상 새 객체가 생성됩니다. 함수는 저장된 객체를 제자리에서 변경하지 않습니다. 이는 함수가 새 객체를 반환하고 절대 변경하지 않는 Triggerfish의 더 넓은 원칙과 일치합니다.

## 디렉터리 구조

```
~/.triggerfish/
  config/          # 에이전트 구성, SPINE.md, TRIGGER.md
  data/            # triggerfish.db (SQLite)
  workspace/       # 에이전트 exec 환경
    <agent-id>/    # 에이전트별 워크스페이스 (유지됨)
    background/    # 백그라운드 세션 워크스페이스
  skills/          # 설치된 스킬
  logs/            # 감사 로그
  secrets/         # 암호화된 자격 증명 저장소
```

::: warning 보안 `secrets/` 디렉터리에는 OS 키체인 연동으로 관리되는 암호화된 자격 증명이 포함됩니다. 시크릿을 구성 파일이나 `StorageProvider`에 절대 저장하지 마십시오. OS 키체인(개인 티어) 또는 vault 연동(엔터프라이즈 티어)을 사용하십시오. :::
