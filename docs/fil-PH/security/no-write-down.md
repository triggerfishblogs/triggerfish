# Ang No Write-Down Rule

Ang no-write-down rule ang pundasyon ng data protection model ng Triggerfish. Isa itong fixed, non-configurable rule na naa-apply sa bawat session, bawat channel, at bawat agent -- walang exceptions at walang LLM override.

**Ang rule:** Ang data ay maaari lang dumaloy sa channels at recipients na may **pantay o mas mataas** na classification level.

Pinipigilan ng iisang rule na ito ang buong klase ng data leakage scenarios, mula sa aksidenteng oversharing hanggang sa sopistikadong prompt injection attacks na dine-design para mag-exfiltrate ng sensitive information.

## Paano Dumadaloy ang Classification

Gumagamit ang Triggerfish ng apat na classification levels (mula pinakamataas hanggang pinakamababa):

<img src="/diagrams/write-down-rules.svg" alt="Write-down rules: dumadaloy ang data sa pantay o mas mataas lang na classification levels" style="max-width: 100%;" />

Ang data na classified sa isang level ay maaaring dumaloy sa level na iyon o sa anumang level sa itaas nito. Hindi ito maaaring dumaloy pababa. Ito ang no-write-down rule.

::: danger Ang no-write-down rule ay **fixed at non-configurable**. Hindi ito maaaring i-relax ng administrators, i-override ng policy rules, o i-bypass ng LLM. Ito ang architectural foundation kung saan nakasalalay ang lahat ng ibang security controls. :::

## Effective Classification

Kapag malapit nang lumabas ng system ang data, kino-compute ng Triggerfish ang **effective classification** ng destination:

```
EFFECTIVE_CLASSIFICATION = min(channel_classification, recipient_classification)
```

Parehong kailangan ng channel at recipient na nasa o mas mataas sa classification level ng data. Kung alinman ang mas mababa, bina-block ang output.

| Channel              | Recipient                    | Effective Classification |
| -------------------- | ---------------------------- | ------------------------ |
| INTERNAL (Slack)     | INTERNAL (katrabaho)         | INTERNAL                 |
| INTERNAL (Slack)     | EXTERNAL (vendor)            | PUBLIC                   |
| CONFIDENTIAL (Slack) | INTERNAL (katrabaho)         | INTERNAL                 |
| CONFIDENTIAL (Email) | EXTERNAL (personal contact)  | PUBLIC                   |

::: info Ang CONFIDENTIAL channel na may EXTERNAL recipient ay may effective classification na PUBLIC. Kung ang session ay nag-access ng anumang data na mas mataas sa PUBLIC, bina-block ang output. :::

## Real-World Example

Narito ang isang concrete scenario na nagpapakita ng no-write-down rule sa aksyon.

```
User: "Check my Salesforce pipeline"

Agent: [nag-a-access ng Salesforce sa pamamagitan ng delegated token ng user]
       [Salesforce data classified bilang CONFIDENTIAL]
       [nag-escalate ang session taint sa CONFIDENTIAL]

       "You have 3 deals closing this week totaling $2.1M..."

User: "Send a message to my wife that I'll be late tonight"

Policy layer: BLOCKED
  - Session taint: CONFIDENTIAL
  - Recipient (wife): EXTERNAL
  - Effective classification: PUBLIC
  - CONFIDENTIAL > PUBLIC --> write-down violation

Agent: "I can't send to external contacts in this session
        because we accessed confidential data.

        -> Reset session and send message
        -> Cancel"
```

Nag-access ang user ng Salesforce data (classified CONFIDENTIAL), na nag-taint sa buong session. Nang subukan nilang magpadala ng mensahe sa external contact (effective classification PUBLIC), bina-block ng policy layer ang output dahil hindi maaaring dumaloy ang CONFIDENTIAL data sa PUBLIC destination.

::: tip Ang mensahe ng agent sa wife ("I'll be late tonight") ay hindi mismo naglalaman ng Salesforce data. Pero nata-taint na ang session ng naunang Salesforce access, at ang buong session context -- kasama ang anumang maaaring na-retain ng LLM mula sa Salesforce response -- ay maaaring mag-impluwensya sa output. Pinipigilan ng no-write-down rule ang buong klase ng context leakage na ito. :::

## Ano ang Nakikita ng User

Kapag bina-block ng no-write-down rule ang isang action, tumatanggap ang user ng malinaw, actionable na mensahe. Nag-aalok ang Triggerfish ng dalawang response mode:

**Default (specific):**

```
I can't send confidential data to a public channel.

-> Reset session and send message
-> Cancel
```

**Educational (opt-in sa pamamagitan ng configuration):**

```
I can't send confidential data to a public channel.

Why: This session accessed Salesforce (CONFIDENTIAL).
WhatsApp personal is classified as PUBLIC.
Data can only flow to equal or higher classification.

Options:
  - Reset session and send message
  - Ask your admin to reclassify the WhatsApp channel
  - Learn more: https://trigger.fish/security/no-write-down
```

Sa parehong kaso, binibigyan ang user ng malinaw na options. Hindi sila naiiwan na confused tungkol sa kung ano ang nangyari o kung ano ang maaari nilang gawin.

## Session Reset

Kapag pinili ng user ang "Reset session and send message," nagsasagawa ang Triggerfish ng **buong reset**:

1. Nili-clear ang session taint pabalik sa PUBLIC
2. Nili-clear ang buong conversation history (pinipigilan ang context leakage)
3. Muli na ine-evaluate ang hiniling na action laban sa sariwang session
4. Kung pinapayagan na ngayon ang action (PUBLIC data sa PUBLIC channel), nagpapatuloy ito

::: warning SECURITY Nili-clear ng session reset ang parehong taint **at** conversation history. Hindi ito optional. Kung taint label lang ang nili-clear habang nananatili ang conversation context, maaari pa ring mag-reference ng classified information mula sa naunang messages ang LLM, na nagta-talo sa layunin ng reset. :::

## Paano Gumagana ang Enforcement

Ine-enforce ang no-write-down rule sa `PRE_OUTPUT` hook -- ang huling enforcement point bago umalis sa system ang anumang data. Tumatakbo ang hook bilang synchronous, deterministic code:

```typescript
// Simplified enforcement logic
function preOutputHook(context: HookContext): HookResult {
  const sessionTaint = getSessionTaint(context.sessionId);
  const channelClassification = getChannelClassification(context.channelId);
  const recipientClassification = getRecipientClassification(
    context.recipientId,
  );

  const effectiveClassification = min(
    channelClassification,
    recipientClassification,
  );

  if (sessionTaint > effectiveClassification) {
    return {
      decision: "BLOCK",
      reason: `Session taint (${sessionTaint}) exceeds effective ` +
        `classification (${effectiveClassification})`,
    };
  }

  return { decision: "ALLOW", reason: "Classification check passed" };
}
```

Ang code na ito ay:

- **Deterministic** -- palaging parehong resulta ang parehong inputs
- **Synchronous** -- nakukumpleto ang hook bago ipadala ang anumang output
- **Unforgeable** -- hindi maaaring impluwensyahan ng LLM ang decision ng hook
- **Logged** -- bawat execution ay nire-record na may buong context

## Session Taint at Escalation

Tina-track ng session taint ang pinakamataas na classification level ng data na na-access sa session. Sumusunod ito sa dalawang strict rules:

1. **Escalation lang** -- maaaring tumaas ang taint, hindi kailanman bumaba sa loob ng session
2. **Automatic** -- ina-update ang taint ng `POST_TOOL_RESPONSE` hook tuwing pumapasok ang data sa session

| Action                                  | Taint Bago  | Taint Pagkatapos                 |
| --------------------------------------- | ----------- | -------------------------------- |
| Access weather API (PUBLIC)             | PUBLIC      | PUBLIC                           |
| Access internal wiki (INTERNAL)         | PUBLIC      | INTERNAL                         |
| Access Salesforce (CONFIDENTIAL)        | INTERNAL    | CONFIDENTIAL                     |
| Access weather API ulit (PUBLIC)        | CONFIDENTIAL | CONFIDENTIAL (walang pagbabago) |

Kapag umabot ang session sa CONFIDENTIAL, nananatili itong CONFIDENTIAL hanggang eksplisitong mag-reset ang user. Walang automatic decay, walang timeout, at walang paraan para ibaba ng LLM ang taint.

## Bakit Fixed ang Rule na Ito

Hindi configurable ang no-write-down rule dahil ang paggawa nitong configurable ay sisira sa buong security model. Kung maaaring gumawa ang administrator ng exception -- "payagan ang CONFIDENTIAL data na dumaloy sa PUBLIC channels para sa isang integration na ito" -- nagiging attack surface ang exception na iyon.

Bawat ibang security control sa Triggerfish ay naka-build sa assumption na absolute ang no-write-down rule. Ang session taint, data lineage, agent delegation ceilings, at audit logging ay lahat umaasa dito. Ang paggawa nitong configurable ay mangangailangan ng pag-rethink ng buong architecture.

::: info **Maaaring** i-configure ng administrators ang classification levels na naka-assign sa channels, recipients, at integrations. Ito ang tamang paraan para i-adjust ang data flow: kung kailangang tumanggap ng mas mataas na classified data ang channel, i-classify ang channel sa mas mataas na level. Nananatiling fixed ang rule mismo; ang inputs sa rule ang configurable. :::

## Mga Kaugnay na Pahina

- [Security-First Design](./) -- overview ng security architecture
- [Identity & Auth](./identity) -- paano nae-establish ang channel identity
- [Audit & Compliance](./audit-logging) -- paano nire-record ang blocked actions
- [Architecture: Taint & Sessions](/fil-PH/architecture/taint-and-sessions) -- session taint mechanics sa detalye
