---
title: Patakaran sa Responsible Disclosure
description: Paano mag-report ng security vulnerabilities sa Triggerfish.
---

# Patakaran sa Responsible Disclosure

## Pag-report ng Vulnerability

**Huwag magbukas ng public GitHub issue para sa security vulnerabilities.**

Mag-report sa pamamagitan ng email:

```
security@trigger.fish
```

Mangyaring isama ang:

- Paglalarawan at potensyal na impact
- Mga hakbang para i-reproduce o proof of concept
- Mga apektadong versions o components
- Iminumungkahing remediation, kung mayroon

## Response Timeline

| Timeline | Aksyon                                            |
| -------- | ------------------------------------------------- |
| 24 oras  | Acknowledgment ng receipt                         |
| 72 oras  | Initial assessment at severity classification     |
| 14 araw  | Fix na developed at tested (critical/high severity) |
| 90 araw  | Coordinated disclosure window                     |

Hinihiling namin na huwag mag-disclose nang publiko bago ang 90-day window o bago mag-release ng fix, alinman ang mauna.

## Saklaw

### Saklaw

- Triggerfish core application ([github.com/greghavens/triggerfish](https://github.com/greghavens/triggerfish))
- Security policy enforcement bypasses (classification, taint tracking, no-write-down)
- Plugin sandbox escapes
- Authentication o authorization bypasses
- MCP Gateway security boundary violations
- Secrets leakage (credentials na lumalabas sa logs, context, o storage)
- Prompt injection attacks na matagumpay na nag-impluwensya ng deterministic policy decisions
- Official Docker images (kapag available) at install scripts

### Wala sa saklaw

- LLM behavior na hindi bina-bypass ang deterministic policy layer (ang model na nagsasabi ng mali ay hindi vulnerability kung tama ang pag-block ng policy layer sa action)
- Third-party skills o plugins na hindi maintained ng Triggerfish
- Social engineering attacks laban sa Triggerfish employees
- Denial-of-service attacks
- Automated scanner reports na walang demonstrated impact

## Safe Harbor

Authorized ang security research na isinasagawa alinsunod sa patakaran na ito. Hindi kami magha-habol ng legal action laban sa researchers na nag-report ng vulnerabilities nang may good faith.

## Pagkilala

Kinikilala namin ang researchers na nag-report ng valid vulnerabilities sa aming release notes at security advisories, maliban kung gusto mong manatiling anonymous. Kasalukuyang wala kaming paid bug bounty program pero maaaring mag-introduce ng isa sa hinaharap.

## PGP Key

Kung kailangan mong i-encrypt ang iyong report, ang aming PGP key para sa `security@trigger.fish` ay naka-publish sa [`https://trigger.fish/.well-known/security.txt`](https://trigger.fish/.well-known/security.txt) at sa mga major keyservers.
