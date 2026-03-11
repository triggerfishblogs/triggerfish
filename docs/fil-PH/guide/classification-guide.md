# Pagpili ng Classification Levels

Bawat channel, MCP server, integration, at plugin sa Triggerfish ay kailangan ng classification level. Tinutulungan ka ng page na ito na piliin ang tamang level.

## Ang Apat na Level

| Level            | Ano ang ibig sabihin                                         | Dumadaloy ang data sa...             |
| ---------------- | ------------------------------------------------------------ | ------------------------------------ |
| **PUBLIC**       | Ligtas para makita ng kahit sino                             | Kahit saan                           |
| **INTERNAL**     | Para sa mata mo lang -- walang sensitive, pero hindi pampubliko | INTERNAL, CONFIDENTIAL, RESTRICTED |
| **CONFIDENTIAL** | May sensitive data na hindi mo gustong ma-leak               | CONFIDENTIAL, RESTRICTED             |
| **RESTRICTED**   | Pinaka-sensitive -- legal, medical, financial, PII           | RESTRICTED lang                      |

Ang data ay maaari lang dumaloy **pataas o pagilid**, hindi pababa. Ito ang [no-write-down rule](/fil-PH/security/no-write-down) at hindi ito maaaring i-override.

## Dalawang Tanong na Dapat Itanong

Para sa anumang integration na kino-configure mo, itanong:

**1. Ano ang pinaka-sensitive na data na maaaring ibalik ng source na ito?**

Ito ang nagde-determine ng **minimum** classification level. Kung ang isang MCP server ay maaaring magbalik ng financial data, kailangan itong maging CONFIDENTIAL kahit na -- kahit na karamihan ng tools nito ay nagbabalik ng harmless metadata.

**2. Magiging komportable ka ba kung ang session data ay dumaloy _papunta_ sa destination na ito?**

Ito ang nagde-determine ng **maximum** classification level na gusto mong i-assign. Ang mas mataas na classification ay nangangahulugang nag-e-escalate ang session taint kapag ginamit mo ito, na nagre-restrict kung saan maaaring dumaloy ang data pagkatapos.

## Classification ayon sa Data Type

| Data type                                    | Recommended level | Bakit                                            |
| -------------------------------------------- | ----------------- | ------------------------------------------------ |
| Weather, public web pages, time zones        | **PUBLIC**        | Malayang available sa lahat                      |
| Personal notes, bookmarks, task lists mo     | **INTERNAL**      | Private pero hindi nakakapinsala kung ma-expose  |
| Internal wikis, team docs, project boards    | **INTERNAL**      | Organization-internal na impormasyon             |
| Email, calendar events, contacts             | **CONFIDENTIAL**  | May mga pangalan, schedules, relationships       |
| CRM data, sales pipeline, customer records   | **CONFIDENTIAL**  | Business-sensitive, customer data                |
| Financial records, bank accounts, invoices   | **CONFIDENTIAL**  | Monetary information                             |
| Source code repositories (private)           | **CONFIDENTIAL**  | Intellectual property                            |
| Medical o health records                     | **RESTRICTED**    | Legally protected (HIPAA, etc.)                  |
| Government ID numbers, SSNs, passports       | **RESTRICTED**    | Identity theft risk                              |
| Legal documents, contracts under NDA         | **RESTRICTED**    | Legal exposure                                   |
| Encryption keys, credentials, secrets        | **RESTRICTED**    | System compromise risk                           |

## Mga MCP Server

Kapag nagdadagdag ng MCP server sa `triggerfish.yaml`, ang classification ay nagde-determine ng dalawang bagay:

1. **Session taint** -- ang pagtawag sa anumang tool sa server na ito ay nag-e-escalate ng session sa level na ito
2. **Write-down prevention** -- ang session na naka-taint na sa itaas ng level na ito ay hindi maaaring magpadala ng data _sa_ server na ito

```yaml
mcp_servers:
  # PUBLIC — open data, walang sensitivity
  weather:
    command: npx
    args: ["-y", "@mcp/server-weather"]
    classification: PUBLIC

  # INTERNAL — sarili mong filesystem, private pero hindi secrets
  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/you/docs"]
    classification: INTERNAL

  # CONFIDENTIAL — nag-a-access ng private repos, customer issues
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  # RESTRICTED — database na may PII, medical records, legal docs
  postgres:
    command: npx
    args: ["-y", "@mcp/server-postgres"]
    env:
      DATABASE_URL: "keychain:prod-db-url"
    classification: RESTRICTED
```

::: warning DEFAULT DENY Kung i-omit mo ang `classification`, nire-register ang server bilang **UNTRUSTED** at rini-reject ng gateway ang lahat ng tool calls. Kailangan mong eksplisitong pumili ng level. :::

### Mga Karaniwang MCP Server Classification

| MCP Server                     | Suggested level | Dahilan                                                |
| ------------------------------ | --------------- | ------------------------------------------------------ |
| Filesystem (public docs)       | PUBLIC          | Nag-e-expose lang ng publicly available na files       |
| Filesystem (home directory)    | INTERNAL        | Personal files, walang secret                          |
| Filesystem (work projects)     | CONFIDENTIAL    | Maaaring may proprietary code o data                   |
| GitHub (public repos only)     | INTERNAL        | Ang code ay public pero ang usage patterns ay private  |
| GitHub (private repos)         | CONFIDENTIAL    | Proprietary source code                                |
| Slack                          | CONFIDENTIAL    | Workplace conversations, posibleng sensitive           |
| Database (analytics/reporting) | CONFIDENTIAL    | Aggregated business data                               |
| Database (production na may PII) | RESTRICTED   | May personally identifiable information                |
| Weather / time / calculator    | PUBLIC          | Walang sensitive data                                  |
| Web search                     | PUBLIC          | Nagbabalik ng publicly available na impormasyon        |
| Email                          | CONFIDENTIAL    | Mga pangalan, conversations, attachments               |
| Google Drive                   | CONFIDENTIAL    | Maaaring may sensitive business data ang mga dokumento |

## Mga Channel

Ang channel classification ay nagde-determine ng **ceiling** -- ang maximum sensitivity ng data na maaaring i-deliver sa channel na iyon.

```yaml
channels:
  cli:
    classification: INTERNAL # Local terminal mo — ligtas para sa internal data
  telegram:
    classification: INTERNAL # Private bot mo — pareho ng CLI para sa owner
  webchat:
    classification: PUBLIC # Anonymous visitors — public data lang
  email:
    classification: CONFIDENTIAL # Ang email ay private pero maaaring i-forward
```

::: tip OWNER vs. NON-OWNER Para sa **owner**, lahat ng channels ay may parehong trust level -- ikaw ay ikaw, anuman ang app na ginagamit mo. Ang channel classification ay pinaka-mahalaga para sa **non-owner users** (visitors sa webchat, members sa isang Slack channel, etc.) kung saan gini-gate nito kung anong data ang maaaring dumaloy sa kanila. :::

### Pagpili ng Channel Classification

| Tanong                                                                              | Kung oo...                | Kung hindi...             |
| ----------------------------------------------------------------------------------- | ------------------------- | ------------------------- |
| Maaari bang makita ng estranghero ang mga mensahe sa channel na ito?                | **PUBLIC**                | Magpatuloy sa pagbasa     |
| Ang channel ba na ito ay para sa iyo lang?                                          | **INTERNAL** o mas mataas | Magpatuloy sa pagbasa     |
| Maaari bang i-forward, i-screenshot, o i-log ng third party ang mga mensahe?        | I-cap sa **CONFIDENTIAL** | Maaaring **RESTRICTED**   |
| Ang channel ba ay end-to-end encrypted at nasa iyong buong kontrol?                 | Maaaring **RESTRICTED**   | I-cap sa **CONFIDENTIAL** |

## Ano ang Mangyayari Kapag Nagkamali Ka

**Masyadong mababa (hal., CONFIDENTIAL server na mina-mark na PUBLIC):**

- Hindi mag-e-escalate ng session taint ang data mula sa server na ito
- Maaaring dumaloy ang classified data ng session sa public channels -- **data leak risk**
- Ito ang mapanganib na direksyon

**Masyadong mataas (hal., PUBLIC server na mina-mark na CONFIDENTIAL):**

- Nag-e-escalate nang hindi kinakailangan ang session taint kapag ginagamit ang server na ito
- Maba-block ka mula sa pagpapadala sa lower-classified channels pagkatapos
- Nakakainis pero **ligtas** -- mag-err sa panig ng masyadong mataas

::: danger Kapag hindi ka sigurado, **mag-classify nang mas mataas**. Maaari mo itong ibaba sa ibang pagkakataon pagkatapos i-review kung anong data talaga ang binabalik ng server. Ang under-classifying ay security risk; ang over-classifying ay inconvenience lang. :::

## Ang Taint Cascade

Ang pag-unawa sa praktikal na impact ay tumutulong sa iyong pumili nang matalino. Narito ang nangyayari sa isang session:

```
1. Nagsisimula ang session sa PUBLIC
2. Nagtanong ka tungkol sa weather (PUBLIC server)      → nananatili ang taint sa PUBLIC
3. Tsineck mo ang notes mo (INTERNAL filesystem)        → nag-escalate ang taint sa INTERNAL
4. Nag-query ka ng GitHub issues (CONFIDENTIAL)         → nag-escalate ang taint sa CONFIDENTIAL
5. Sinubukan mong mag-post sa webchat (PUBLIC channel)  → BLOCKED (write-down violation)
6. Nag-reset ka ng session                              → bumalik ang taint sa PUBLIC
7. Nag-post ka sa webchat                               → pinapayagan
```

Kung madalas kang gumamit ng CONFIDENTIAL tool na sinusundan ng PUBLIC channel, madalas kang magre-reset. Pag-isipan kung talagang kailangan ng tool ang CONFIDENTIAL, o kung maaaring i-reclassify ang channel.

## Mga Filesystem Path

Maaari mo ring i-classify ang individual filesystem paths, na kapaki-pakinabang kapag ang agent mo ay may access sa directories na may mixed sensitivity:

```yaml
filesystem:
  default: INTERNAL
  paths:
    "/home/you/public": PUBLIC
    "/home/you/work/clients": CONFIDENTIAL
    "/home/you/legal": RESTRICTED
```

## Review Checklist

Bago mag-go live sa bagong integration:

- [ ] Ano ang pinakamasamang data na maaaring ibalik ng source na ito? I-classify sa level na iyon.
- [ ] Ang classification ba ay hindi bababa sa iminumungkahi ng data type table?
- [ ] Kung ito ay isang channel, ang classification ba ay angkop para sa lahat ng posibleng recipients?
- [ ] Na-test mo ba na gumagana ang taint cascade para sa iyong tipikal na workflow?
- [ ] Kapag hindi sigurado, nag-classify ka ba nang mas mataas sa halip na mas mababa?

## Mga Kaugnay na Pahina

- [No Write-Down Rule](/fil-PH/security/no-write-down) -- ang fixed data flow rule
- [Configuration](/fil-PH/guide/configuration) -- buong YAML reference
- [MCP Gateway](/fil-PH/integrations/mcp-gateway) -- MCP server security model
