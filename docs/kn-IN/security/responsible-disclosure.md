---
title: Responsible Disclosure Policy
description: Triggerfish ನಲ್ಲಿ ಭದ್ರತಾ vulnerabilities ವರದಿ ಮಾಡುವ ವಿಧಾನ.
---

# Responsible Disclosure Policy

## Vulnerability ವರದಿ ಮಾಡುವ ವಿಧಾನ

**ಭದ್ರತಾ vulnerabilities ಗಾಗಿ public GitHub issue ತೆರೆಯಬೇಡಿ.**

Email ಮೂಲಕ ವರದಿ ಮಾಡಿ:

```
security@trigger.fish
```

ದಯವಿಟ್ಟು ಸೇರಿಸಿ:

- ವಿವರಣೆ ಮತ್ತು ಸಂಭಾವ್ಯ ಪರಿಣಾಮ
- ಪುನರಾವರ್ತಿಸುವ ಹಂತಗಳು ಅಥವಾ proof of concept
- ಪ್ರಭಾವಿತ versions ಅಥವಾ components
- ಸೂಚಿಸಿದ remediation, ಯಾವುದಾದರೂ ಇದ್ದರೆ

## Response Timeline

| Timeline | ಕ್ರಿಯೆ                                               |
| -------- | ----------------------------------------------------- |
| 24 ಗಂಟೆ  | ಸ್ವೀಕೃತಿ acknowledgment                               |
| 72 ಗಂಟೆ  | ಆರಂಭಿಕ assessment ಮತ್ತು severity classification        |
| 14 ದಿನ   | Fix ಅಭಿವೃದ್ಧಿ ಮತ್ತು ಪರೀಕ್ಷಿಸಲ್ಪಟ್ಟಿದೆ (critical/high severity) |
| 90 ದಿನ   | Coordinated disclosure window                         |

Fix release ಆಗುವ ಮೊದಲು ಅಥವಾ 90-day window ಮೊದಲು, ಯಾವುದು ಮೊದಲು ಬಂದರೂ, publicly
disclose ಮಾಡದಂತೆ ಕೋರುತ್ತೇವೆ.

## ವ್ಯಾಪ್ತಿ

### In scope

- Triggerfish core application
  ([github.com/greghavens/triggerfish](https://github.com/greghavens/triggerfish))
- ಭದ್ರತಾ policy enforcement bypasses (classification, taint tracking, no-write-down)
- Plugin sandbox escapes
- Authentication ಅಥವಾ authorization bypasses
- MCP Gateway ಭದ್ರತಾ boundary violations
- Secrets leakage (credentials logs, context, ಅಥವಾ storage ನಲ್ಲಿ ಕಾಣಿಸಿಕೊಂಡಾಗ)
- Deterministic policy decisions ಯಶಸ್ವಿಯಾಗಿ ಪ್ರಭಾವಿಸುವ Prompt injection attacks
- Official Docker images (ಲಭ್ಯವಾದಾಗ) ಮತ್ತು install scripts

### Out of scope

- LLM ನಡವಳಿಕೆ deterministic policy layer bypass ಮಾಡದ (policy layer correctly action ತಡೆಗಟ್ಟಿದ್ದರೆ model ತಪ್ಪಾದ ಏನೋ ಹೇಳುವುದು vulnerability ಅಲ್ಲ)
- Triggerfish ನಿಂದ manage ಮಾಡದ Third-party skills ಅಥವಾ plugins
- Triggerfish employees ವಿರುದ್ಧ Social engineering attacks
- Denial-of-service attacks
- Demonstrated impact ಇಲ್ಲದ ಸ್ವಯಂಚಾಲಿತ scanner ವರದಿಗಳು

## Safe Harbor

ಈ policy ಅನುಸಾರ ನಡೆಸಲ್ಪಟ್ಟ ಭದ್ರತಾ research ಅಧಿಕೃತ. ಸದ್ಭಾವನೆಯಿಂದ vulnerabilities ವರದಿ
ಮಾಡುವ researchers ವಿರುದ್ಧ ನಾವು ಕಾನೂನು ಕ್ರಮ ತೆಗೆದುಕೊಳ್ಳುವುದಿಲ್ಲ. Privacy violations,
data destruction, ಮತ್ತು service disruption ತಪ್ಪಿಸಲು ಸದ್ಭಾವನಾ ಪ್ರಯತ್ನ ಮಾಡಲು ಕೋರುತ್ತೇವೆ.

## ಮಾನ್ಯತೆ

Valid vulnerabilities ವರದಿ ಮಾಡುವ researchers ಅನಾಮಧೇಯ ಇರಲು ಬಯಸದಿದ್ದರೆ ನಮ್ಮ release notes
ಮತ್ತು security advisories ನಲ್ಲಿ credit ಮಾಡಲ್ಪಡುತ್ತಾರೆ. ನಾವು ಪ್ರಸ್ತುತ paid bug bounty
program ನೀಡುವುದಿಲ್ಲ ಆದರೆ ಭವಿಷ್ಯದಲ್ಲಿ ಒಂದನ್ನು ಪರಿಚಯಿಸಬಹುದು.

## PGP Key

ನಿಮ್ಮ ವರದಿ encrypt ಮಾಡಬೇಕಾದರೆ, `security@trigger.fish` ಗಾಗಿ ನಮ್ಮ PGP key
[`https://trigger.fish/.well-known/security.txt`](https://trigger.fish/.well-known/security.txt)
ನಲ್ಲಿ ಮತ್ತು ಪ್ರಮುಖ keyservers ನಲ್ಲಿ ಪ್ರಕಟಿಸಲ್ಪಟ್ಟಿದೆ.
