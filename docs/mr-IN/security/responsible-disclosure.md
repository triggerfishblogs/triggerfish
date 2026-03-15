---
title: Responsible Disclosure Policy
description: Triggerfish मध्ये security vulnerabilities कसे report करायचे.
---

# Responsible Disclosure Policy

## Vulnerability Report करणे

**Security vulnerabilities साठी public GitHub issue उघडू नका.**

Email द्वारे report करा:

```
security@trigger.fish
```

कृपया include करा:

- Description आणि potential impact
- Steps to reproduce किंवा proof of concept
- Affected versions किंवा components
- Suggested remediation, असल्यास

## Response Timeline

| Timeline | Action                                            |
| -------- | ------------------------------------------------- |
| 24 hours | Receipt ची Acknowledgment                         |
| 72 hours | Initial assessment आणि severity classification    |
| 14 days  | Fix developed आणि tested (critical/high severity) |
| 90 days  | Coordinated disclosure window                     |

आम्ही request करतो की तुम्ही 90-day window पूर्वी किंवा fix release होण्यापूर्वी,
यापैकी जे आधी असेल, publicly disclose करू नका.

## Scope

### In scope

- Triggerfish core application
  ([github.com/greghavens/triggerfish](https://github.com/greghavens/triggerfish))
- Security policy enforcement bypasses (classification, taint tracking,
  no-write-down)
- Plugin sandbox escapes
- Authentication किंवा authorization bypasses
- MCP Gateway security boundary violations
- Secrets leakage (credentials logs, context, किंवा storage मध्ये appearing)
- Prompt injection attacks जे deterministic policy decisions वर successfully
  influence करतात
- Official Docker images (available असल्यास) आणि install scripts

### Out of scope

- LLM behavior जे deterministic policy layer bypass करत नाही (model काहीतरी
  चुकीचे सांगणे vulnerability नाही जर policy layer ने action correctly block केले)
- Triggerfish द्वारे maintained नसलेले Third-party skills किंवा plugins
- Triggerfish employees विरुद्ध Social engineering attacks
- Denial-of-service attacks
- Demonstrated impact शिवाय Automated scanner reports

## Safe Harbor

या policy नुसार conducted security research authorized आहे. Good faith मध्ये
vulnerabilities report करणाऱ्या researchers विरुद्ध आम्ही legal action pursue करणार
नाही. आम्ही request करतो की तुम्ही privacy violations, data destruction, आणि
service disruption टाळण्याचा good faith effort करा.

## Recognition

Valid vulnerabilities report करणाऱ्या researchers ला आम्ही आमच्या release notes
आणि security advisories मध्ये credit करतो, जोपर्यंत तुम्ही anonymous राहणे prefer
करत नाही. आम्ही सध्या paid bug bounty program offer करत नाही पण भविष्यात introduce
करू शकतो.

## PGP Key

तुम्हाला तुमचा report encrypt करण्याची आवश्यकता असल्यास, `security@trigger.fish`
साठी आमचा PGP key
[`https://trigger.fish/.well-known/security.txt`](https://trigger.fish/.well-known/security.txt)
वर आणि major keyservers वर published आहे.
