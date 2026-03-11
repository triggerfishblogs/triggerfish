# Storage

Triggerfish में सभी स्टेटफुल डेटा एक एकीकृत `StorageProvider` अमूर्तन के
माध्यम से प्रवाहित होता है। कोई मॉड्यूल अपना स्वयं का storage तंत्र नहीं
बनाता -- persistence की आवश्यकता वाला प्रत्येक घटक एक `StorageProvider` को
निर्भरता के रूप में लेता है।

## StorageProvider Interface

```typescript
interface StorageProvider {
  /** कुंजी द्वारा मान प्राप्त करें। न मिलने पर null लौटाता है। */
  get(key: string): Promise<StorageValue | null>;

  /** कुंजी पर मान संग्रहीत करें। मौजूदा मान को ओवरराइट करता है। */
  set(key: string, value: StorageValue): Promise<void>;

  /** कुंजी हटाएँ। कुंजी न होने पर कोई कार्रवाई नहीं। */
  delete(key: string): Promise<void>;

  /** वैकल्पिक उपसर्ग से मेल खाने वाली सभी कुंजियाँ सूचीबद्ध करें। */
  list(prefix?: string): Promise<string[]>;

  /** सभी कुंजियाँ हटाएँ। सावधानी से उपयोग करें। */
  clear(): Promise<void>;
}
```

::: info `StorageValue` एक string है। सभी संरचित डेटा storage से पहले JSON में
क्रमबद्ध और पढ़ने पर विक्रमबद्ध किया जाता है। :::

## कार्यान्वयन

| Backend                 | उपयोग                         | Persistence                                        | कॉन्फ़िगरेशन                 |
| ----------------------- | ----------------------------- | -------------------------------------------------- | ----------------------------- |
| `MemoryStorageProvider` | परीक्षण, अल्पकालिक sessions   | कोई नहीं (पुनरारंभ पर खो जाता है)                  | कॉन्फ़िगरेशन आवश्यक नहीं     |
| `SqliteStorageProvider` | व्यक्तिगत स्तर के लिए डिफ़ॉल्ट | `~/.triggerfish/data/triggerfish.db` पर SQLite WAL  | शून्य कॉन्फ़िगरेशन           |
| एंटरप्राइज़ backends    | एंटरप्राइज़ स्तर              | ग्राहक-प्रबंधित                                    | Postgres, S3, या अन्य backends |

## नेमस्पेस्ड कुंजियाँ

| नेमस्पेस         | कुंजी पैटर्न                                 | विवरण                                          |
| ---------------- | -------------------------------------------- | ---------------------------------------------- |
| `sessions:`      | `sessions:sess_abc123`                       | Session स्थिति (वार्तालाप इतिहास, मेटाडेटा)   |
| `taint:`         | `taint:sess_abc123`                          | Session taint स्तर                             |
| `lineage:`       | `lineage:lin_789xyz`                         | डेटा lineage रिकॉर्ड (उत्पत्ति ट्रैकिंग)     |
| `audit:`         | `audit:2025-01-29T10:23:45Z:hook_pre_output` | ऑडिट लॉग प्रविष्टियाँ                         |
| `cron:`          | `cron:job_daily_report`                      | Cron job स्थिति और निष्पादन इतिहास             |
| `notifications:` | `notifications:notif_456`                    | Notification कतार                              |
| `exec:`          | `exec:run_789`                               | Agent निष्पादन वातावरण इतिहास                  |
| `skills:`        | `skills:skill_weather`                       | इंस्टॉल किए गए skill मेटाडेटा                 |
| `config:`        | `config:v3`                                  | कॉन्फ़िगरेशन स्नैपशॉट                        |

## प्रतिधारण नीतियाँ

| नेमस्पेस         | डिफ़ॉल्ट प्रतिधारण            | तर्क                                         |
| ---------------- | ----------------------------- | --------------------------------------------- |
| `sessions:`      | 30 दिन                       | वार्तालाप इतिहास की अवधि समाप्त होती है       |
| `taint:`         | Session प्रतिधारण से मेल खाता | Taint बिना session के अर्थहीन है              |
| `lineage:`       | 90 दिन                       | अनुपालन-संचालित, ऑडिट ट्रेल                   |
| `audit:`         | 1 वर्ष                       | अनुपालन-संचालित, कानूनी और नियामक              |
| `cron:`          | 30 दिन                       | डिबगिंग के लिए निष्पादन इतिहास                |
| `notifications:` | डिलीवरी तक + 7 दिन           | अवितरित notifications बनी रहनी चाहिए          |
| `exec:`          | 30 दिन                       | डिबगिंग के लिए निष्पादन आर्टिफ़ैक्ट          |
| `skills:`        | स्थायी                       | इंस्टॉल किए गए skill मेटाडेटा की समय सीमा नहीं |
| `config:`        | 10 संस्करण                   | रोलबैक के लिए रोलिंग कॉन्फ़िग इतिहास         |

## निर्देशिका संरचना

```
~/.triggerfish/
  config/          # Agent कॉन्फ़िगरेशन, SPINE.md, TRIGGER.md
  data/            # triggerfish.db (SQLite)
  workspace/       # Agent exec वातावरण
    <agent-id>/    # प्रति-agent कार्यक्षेत्र (स्थायी)
    background/    # Background session कार्यक्षेत्र
  skills/          # इंस्टॉल किए गए skills
  logs/            # ऑडिट लॉग
  secrets/         # एन्क्रिप्टेड credential स्टोर
```

::: warning सुरक्षा `secrets/` निर्देशिका में OS keychain एकीकरण द्वारा
प्रबंधित एन्क्रिप्टेड credentials हैं। कभी भी कॉन्फ़िगरेशन फ़ाइलों या
`StorageProvider` में secrets संग्रहीत न करें। :::
