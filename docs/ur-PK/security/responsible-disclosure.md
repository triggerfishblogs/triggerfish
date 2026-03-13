---
title: Responsible Disclosure Policy
description: Triggerfish میں سیکیورٹی vulnerabilities کیسے رپورٹ کریں۔
---

# Responsible Disclosure Policy

## Vulnerability رپورٹ کرنا

**سیکیورٹی vulnerabilities کے لیے public GitHub issue مت کھولیں۔**

Email کے ذریعے رپورٹ کریں:

```
security@trigger.fish
```

براہ کرم شامل کریں:

- تفصیل اور ممکنہ اثر
- Reproduce کرنے کے اقدامات یا proof of concept
- متاثرہ versions یا components
- تجویز کردہ remediation، اگر کوئی ہو

## Response Timeline

| Timeline  | عمل                                                      |
| --------- | -------------------------------------------------------- |
| 24 گھنٹے  | موصولی کی تصدیق                                          |
| 72 گھنٹے  | ابتدائی assessment اور severity classification           |
| 14 دن     | Fix تیار اور tested (critical/high severity)             |
| 90 دن     | Coordinated disclosure window                            |

ہم آپ سے گزارش کرتے ہیں کہ 90 دن کی window سے پہلے یا fix جاری ہونے سے پہلے،
جو بھی پہلے ہو، عوامی طور پر ظاہر نہ کریں۔

## دائرہ کار

### شامل

- Triggerfish core application
  ([github.com/greghavens/triggerfish](https://github.com/greghavens/triggerfish))
- Security policy enforcement bypasses (classification، taint tracking،
  no-write-down)
- Plugin sandbox escapes
- Authentication یا authorization bypasses
- MCP Gateway security boundary violations
- Secrets leakage (credentials logs، context، یا storage میں ظاہر ہوں)
- Prompt injection attacks جو یقینی policy فیصلوں کو کامیابی سے متاثر کریں
- Official Docker images (جب دستیاب ہوں) اور install scripts

### شامل نہیں

- LLM رویہ جو یقینی policy layer کو bypass نہ کرے (اگر model کچھ غلط کہے تو یہ
  vulnerability نہیں ہے اگر policy layer نے action صحیح طریقے سے block کیا)
- Third-party skills یا plugins جو Triggerfish کی طرف سے maintained نہیں
- Triggerfish ملازمین کے خلاف social engineering attacks
- Denial-of-service attacks
- Demonstrated impact کے بغیر automated scanner reports

## Safe Harbor

اس policy کے مطابق conduct کی گئی سیکیورٹی research مجاز ہے۔ ہم ان researchers کے
خلاف قانونی کارروائی نہیں کریں گے جو good faith میں vulnerabilities رپورٹ کریں۔ ہم
آپ سے گزارش کرتے ہیں کہ privacy violations، ڈیٹا تباہی، اور خدمت میں خلل سے بچنے
کے لیے good faith کوشش کریں۔

## Recognition

ہم ان researchers کا اعتراف کرتے ہیں جو اپنے release notes اور security advisories
میں valid vulnerabilities رپورٹ کریں، جب تک کہ آپ anonymous رہنا نہ چاہیں۔ ہم
اس وقت paid bug bounty program نہیں پیش کرتے لیکن مستقبل میں ایک متعارف کرا سکتے ہیں۔

## PGP Key

اگر آپ کو اپنی رپورٹ encrypt کرنی ہو، تو `security@trigger.fish` کے لیے ہماری PGP
key
[`https://trigger.fish/.well-known/security.txt`](https://trigger.fish/.well-known/security.txt)
پر اور بڑے keyservers پر شائع ہے۔
