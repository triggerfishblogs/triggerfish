# Storage

Triggerfish ನಲ್ಲಿ ಎಲ್ಲ ಸ್ಥಿತಿಪ್ರಧಾನ ಡೇಟಾ ಏಕೀಕೃತ `StorageProvider` ಅಮೂರ್ತತೆ ಮೂಲಕ
ಹರಿಯುತ್ತದೆ. ಯಾವ module ತನ್ನದೇ storage ಕಾರ್ಯವಿಧಾನ ರಚಿಸುವುದಿಲ್ಲ -- persistence ಅಗತ್ಯ
ಹೊಂದಿರುವ ಪ್ರತಿ ಘಟಕ dependency ಆಗಿ `StorageProvider` ತೆಗೆದುಕೊಳ್ಳುತ್ತದೆ. ಈ ವಿನ್ಯಾಸ
business logic ಸ್ಪರ್ಶಿಸದೆ backends ಬದಲಾಯಿಸಲಾಗದ ಮತ್ತು ಎಲ್ಲ tests ವೇಗ ಮತ್ತು
ನಿರ್ಧಾರಾತ್ಮಕ ಮಾಡುತ್ತದೆ.

## StorageProvider Interface

```typescript
interface StorageProvider {
  /** ಕೀ ಮೂಲಕ ಮೌಲ್ಯ ಹಿಂಪಡೆಯಿರಿ. ಕಂಡುಬಂದಿಲ್ಲದಿದ್ದರೆ null ಮರಳಿಸಿ. */
  get(key: string): Promise<StorageValue | null>;

  /** ಕೀ ನಲ್ಲಿ ಮೌಲ್ಯ ಸಂಗ್ರಹಿಸಿ. ಅಸ್ತಿತ್ವದಲ್ಲಿರುವ ಮೌಲ್ಯ ಅತಿಕ್ರಮಿಸುತ್ತದೆ. */
  set(key: string, value: StorageValue): Promise<void>;

  /** ಕೀ ಅಳಿಸಿ. ಕೀ ಇಲ್ಲದಿದ್ದರೆ no-op. */
  delete(key: string): Promise<void>;

  /** ಐಚ್ಛಿಕ prefix ಹೊಂದಾಣಿಕೆಯ ಎಲ್ಲ keys ಪಟ್ಟಿ ಮಾಡಿ. */
  list(prefix?: string): Promise<string[]>;

  /** ಎಲ್ಲ keys ಅಳಿಸಿ. ಎಚ್ಚರಿಕೆಯಿಂದ ಬಳಸಿ. */
  clear(): Promise<void>;
}
```

## ಅಳವಡಿಕೆಗಳು

| Backend                 | ಬಳಕೆ ಪ್ರಕರಣ                  | Persistence                                          | ಕಾನ್ಫಿಗರೇಶನ್                   |
| ----------------------- | ---------------------------- | ---------------------------------------------------- | ------------------------------ |
| `MemoryStorageProvider` | Testing, ಅಲ್ಪಕಾಲಿಕ sessions  | ಯಾವುದೂ ಇಲ್ಲ (ಮರುಪ್ರಾರಂಭದಲ್ಲಿ ಕಳೆದುಹೋಗುತ್ತದೆ)        | ಕಾನ್ಫಿಗರೇಶನ್ ಅಗತ್ಯವಿಲ್ಲ        |
| `SqliteStorageProvider` | Personal tier ಗಾಗಿ ಡಿಫಾಲ್ಟ್  | `~/.triggerfish/data/triggerfish.db` ನಲ್ಲಿ SQLite WAL | ಶೂನ್ಯ ಕಾನ್ಫಿಗರೇಶನ್              |
| Enterprise backends     | Enterprise tier              | ಗ್ರಾಹಕ-ನಿರ್ವಹಿಸಲ್ಪಟ್ಟ                               | Postgres, S3 ಅಥವಾ ಇತರ backends |

## Namespaced Keys

Storage system ನಲ್ಲಿ ಎಲ್ಲ keys ಡೇಟಾ ಪ್ರಕಾರ ಗುರುತಿಸುವ prefix ನೊಂದಿಗೆ namespaced ಆಗಿವೆ.

| Namespace        | ಕೀ ಮಾದರಿ                                      | ವಿವರಣೆ                                           |
| ---------------- | ---------------------------------------------- | ------------------------------------------------ |
| `sessions:`      | `sessions:sess_abc123`                         | Session ಸ್ಥಿತಿ (ಸಂಭಾಷಣೆ ಇತಿಹಾಸ, metadata)        |
| `taint:`         | `taint:sess_abc123`                            | Session taint ಮಟ್ಟ                               |
| `lineage:`       | `lineage:lin_789xyz`                           | ಡೇಟಾ lineage ದಾಖಲೆಗಳು (provenance ಟ್ರ್ಯಾಕಿಂಗ್)  |
| `audit:`         | `audit:2025-01-29T10:23:45Z:hook_pre_output`   | ಆಡಿಟ್ ಲಾಗ್ ಎಂಟ್ರಿಗಳು                              |
| `cron:`          | `cron:job_daily_report`                        | Cron ಕೆಲಸದ ಸ್ಥಿತಿ ಮತ್ತು ಎಕ್ಸಿಕ್ಯೂಶನ್ ಇತಿಹಾಸ       |
| `notifications:` | `notifications:notif_456`                      | ಅಧಿಸೂಚನೆ queue                                   |
| `skills:`        | `skills:skill_weather`                         | ಸ್ಥಾಪಿಸಲಾದ skill metadata                         |

## ಉಳಿಕೆ ನೀತಿಗಳು

| Namespace        | ಡಿಫಾಲ್ಟ್ ಉಳಿಕೆ         | ಕಾರಣ                                          |
| ---------------- | ---------------------- | --------------------------------------------- |
| `sessions:`      | 30 ದಿನಗಳು              | ಸಂಭಾಷಣೆ ಇತಿಹಾಸ ಹಳೆಯದಾಗುತ್ತದೆ                  |
| `taint:`         | Session ಉಳಿಕೆ ಹೊಂದಾಣಿಕೆ | Session ಇಲ್ಲದೆ Taint ಅರ್ಥಹೀನ                  |
| `lineage:`       | 90 ದಿನಗಳು              | Compliance-ಚಾಲಿತ, ಆಡಿಟ್ ಟ್ರೇಲ್                |
| `audit:`         | 1 ವರ್ಷ                 | Compliance-ಚಾಲಿತ, ಕಾನೂನು ಮತ್ತು ನಿಯಂತ್ರಕ       |
| `notifications:` | ವಿತರಿಸಿದ ನಂತರ + 7 ದಿನ  | ವಿತರಿಸದ ಅಧಿಸೂಚನೆಗಳು ಉಳಿಯಬೇಕು                  |
| `skills:`        | ಶಾಶ್ವತ                 | ಸ್ಥಾಪಿಸಲಾದ skill metadata ಅವಧಿ ಮೀರಬಾರದು        |

## ಡೈರೆಕ್ಟರಿ ರಚನೆ

```
~/.triggerfish/
  config/          # ಏಜೆಂಟ್ ಕಾನ್ಫಿಗರೇಶನ್, SPINE.md, TRIGGER.md
  data/            # triggerfish.db (SQLite)
  workspace/       # ಏಜೆಂಟ್ exec ಪರಿಸರ
    <agent-id>/    # ಪ್ರತಿ-ಏಜೆಂಟ್ workspace (ಉಳಿಯುತ್ತದೆ)
    background/    # ಹಿನ್ನೆಲೆ session workspaces
  skills/          # ಸ್ಥಾಪಿಸಲಾದ skills
  logs/            # ಆಡಿಟ್ ಲಾಗ್‌ಗಳು
  secrets/         # ಎನ್‌ಕ್ರಿಪ್ಟ್ ರುಜುವಾತು ಸಂಗ್ರಹ
```

::: warning SECURITY `secrets/` ಡೈರೆಕ್ಟರಿ OS keychain ಏಕೀಕರಣದಿಂದ ನಿರ್ವಹಿಸಲ್ಪಡುವ
ಎನ್‌ಕ್ರಿಪ್ಟ್ ರುಜುವಾತುಗಳನ್ನು ಒಳಗೊಂಡಿದೆ. ಕಾನ್ಫಿಗರೇಶನ್ ಫೈಲ್‌ಗಳಲ್ಲಿ ಅಥವಾ
`StorageProvider` ನಲ್ಲಿ secrets ಸಂಗ್ರಹಿಸಬೇಡಿ. OS keychain (personal tier) ಅಥವಾ
vault ಏಕೀಕರಣ (enterprise tier) ಬಳಸಿ. :::
