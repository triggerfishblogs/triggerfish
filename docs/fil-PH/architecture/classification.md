# Classification System

Ang data classification system ang pundasyon ng security model ng Triggerfish.
Bawat piraso ng data na pumapasok, dumadaan, o umaalis sa system
ay may classification label. Tinutukoy ng mga label na ito kung saan maaaring dumaloy ang data --
at mas mahalaga, kung saan hindi ito maaari.

## Mga Classification Level

Gumagamit ang Triggerfish ng isang four-tier ordered hierarchy para sa lahat ng deployments.

| Level          | Rank        | Paglalarawan                                         | Mga Halimbawa                                                       |
| -------------- | ----------- | ---------------------------------------------------- | ------------------------------------------------------------------- |
| `RESTRICTED`   | 4 (pinakamataas) | Pinaka-sensitibong data na nangangailangan ng maximum protection | M&A documents, board materials, PII, bank accounts, medical records |
| `CONFIDENTIAL` | 3           | Business-sensitive o personal-sensitive na impormasyon | CRM data, financials, HR records, contracts, tax records            |
| `INTERNAL`     | 2           | Hindi para sa external sharing                       | Internal wikis, team documents, personal notes, contacts            |
| `PUBLIC`       | 1 (pinakamababa) | Ligtas para makita ng kahit sino                     | Marketing materials, public documentation, general web content      |

## Ang No Write-Down Rule

Ang pinaka-importanteng security invariant sa Triggerfish:

::: danger Ang data ay maaari lamang dumaloy sa channels o recipients na may **equal o higher**
classification. Ito ay isang **fixed rule** -- hindi ito ma-configure, ma-override,
o ma-disable. Hindi kayang i-influence ng LLM ang decision na ito. :::

<img src="/diagrams/classification-hierarchy.svg" alt="Classification hierarchy: PUBLIC → INTERNAL → CONFIDENTIAL → RESTRICTED. Pataas lamang ang daloy ng data." style="max-width: 100%;" />

Ibig sabihin nito:

- Ang response na naglalaman ng `CONFIDENTIAL` data ay hindi maaring ipadala sa `PUBLIC` channel
- Ang session na tainted sa `RESTRICTED` ay hindi maaring mag-output sa anumang channel na mas mababa sa
  `RESTRICTED`
- Walang admin override, walang enterprise escape hatch, at walang LLM workaround

## Effective Classification

Parehong may classification levels ang channels at recipients. Kapag malapit nang
umalis ang data sa system, ang **effective classification** ng destination ang nagde-determine
kung ano ang maaaring ipadala:

```
EFFECTIVE_CLASSIFICATION = min(channel_classification, recipient_classification)
```

Ang effective classification ang _mas mababa_ sa dalawa. Ibig sabihin, ang
high-classification channel na may low-classification recipient ay itinuturing pa rin
bilang low-classification.

| Channel        | Recipient  | Effective      | Makakatanggap ba ng CONFIDENTIAL data? |
| -------------- | ---------- | -------------- | -------------------------------------- |
| `INTERNAL`     | `INTERNAL` | `INTERNAL`     | Hindi (CONFIDENTIAL > INTERNAL)        |
| `INTERNAL`     | `EXTERNAL` | `PUBLIC`       | Hindi                                  |
| `CONFIDENTIAL` | `INTERNAL` | `INTERNAL`     | Hindi (CONFIDENTIAL > INTERNAL)        |
| `CONFIDENTIAL` | `EXTERNAL` | `PUBLIC`       | Hindi                                  |
| `RESTRICTED`   | `INTERNAL` | `INTERNAL`     | Hindi (CONFIDENTIAL > INTERNAL)        |

## Mga Patakaran sa Channel Classification

Bawat channel type ay may mga partikular na patakaran para sa pagtukoy ng classification level nito.

### Email

- **Domain matching**: Ang mga mensaheng `@company.com` ay ini-classify bilang `INTERNAL`
- Kino-configure ng admin kung aling mga domain ang internal
- Ang mga hindi kilala o external na domain ay naka-default sa `EXTERNAL`
- Ang mga external recipient ay nagpapababa ng effective classification sa `PUBLIC`

### Slack / Teams

- **Workspace membership**: Ang mga miyembro ng parehong workspace/tenant ay `INTERNAL`
- Ang Slack Connect external users ay ini-classify bilang `EXTERNAL`
- Ang guest users ay ini-classify bilang `EXTERNAL`
- Kinukuha ang classification mula sa platform API, hindi mula sa interpretasyon ng LLM

### WhatsApp / Telegram / iMessage

- **Enterprise**: Ang mga phone numbers na naka-match sa HR directory sync ang nagde-determine
  ng internal vs. external
- **Personal**: Lahat ng recipients ay naka-default sa `EXTERNAL`
- Maaaring markahan ng mga user ang mga trusted contacts, pero hindi nito binabago ang classification
  math -- binabago nito ang recipient classification

### WebChat

- Ang WebChat visitors ay palaging ini-classify bilang `PUBLIC` (ang mga visitors ay hindi
  na-verify bilang owner)
- Ang WebChat ay para sa public-facing interactions

### CLI

- Ang CLI channel ay tumatakbo locally at ini-classify base sa authenticated user
- Ang direct terminal access ay karaniwang `INTERNAL` o mas mataas

## Mga Source ng Recipient Classification

### Enterprise

- **Directory sync** (Okta, Azure AD, Google Workspace) ay awtomatikong nagpo-populate
  ng recipient classifications
- Lahat ng directory members ay ini-classify bilang `INTERNAL`
- Ang external guests at vendors ay ini-classify bilang `EXTERNAL`
- Maaaring mag-override ang admins per-contact o per-domain

### Personal

- **Default**: Lahat ng recipients ay `EXTERNAL`
- Maaaring mag-reclassify ang mga user ng trusted contacts sa pamamagitan ng in-flow prompts o companion app
- Ang reclassification ay explicit at logged

## Mga Channel State

Bawat channel ay dumadaan sa isang state machine bago ito makapagdala ng data:

<img src="/diagrams/state-machine.svg" alt="Channel state machine: UNTRUSTED → CLASSIFIED o BLOCKED" style="max-width: 100%;" />

| State        |  Makakatanggap ba ng data?  | Makakapagpadala ba ng data sa agent context? | Paglalarawan                                           |
| ------------ | :-------------------------: | :------------------------------------------: | ------------------------------------------------------ |
| `UNTRUSTED`  |            Hindi            |                    Hindi                     | Default para sa bago/hindi kilalang channels. Ganap na isolated. |
| `CLASSIFIED` |  Oo (sa loob ng policy)     |        Oo (may classification)               | Na-review at na-assign ng classification level.        |
| `BLOCKED`    |            Hindi            |                    Hindi                     | Tahasan na ipinagbawal ng admin o user.                |

::: warning SECURITY Ang mga bagong channels ay palaging naka-land sa `UNTRUSTED` state. Hindi
sila makakatanggap ng anumang data mula sa agent at hindi makakapagpadala ng data sa agent
context. Nananatiling ganap na isolated ang channel hanggang sa tahasan itong i-classify ng admin (enterprise) o
ng user (personal). :::

## Paano Nag-interact ang Classification sa Ibang mga System

Hindi standalone feature ang classification -- nagda-drive ito ng mga desisyon sa buong
platform:

| System               | Paano ginagamit ang classification                                           |
| -------------------- | ---------------------------------------------------------------------------- |
| **Session taint**    | Ang pag-access ng classified data ay ine-escalate ang session sa level na iyon |
| **Policy hooks**     | Kinocompare ng PRE_OUTPUT ang session taint laban sa destination classification |
| **MCP Gateway**      | Ang MCP server responses ay may classification na nagta-taint sa session      |
| **Data lineage**     | Bawat lineage record ay may kasamang classification level at dahilan          |
| **Notifications**    | Ang notification content ay napapailalim sa parehong classification rules     |
| **Agent delegation** | Ang classification ceiling ng callee agent ay kailangang tumugma sa taint ng caller |
| **Plugin sandbox**   | Awtomatikong kina-classify ng Plugin SDK ang lahat ng emitted data           |
