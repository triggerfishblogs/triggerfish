# No Write-Down Rule

No-write-down rule Triggerfish च्या data protection model चा foundation आहे.
हे एक fixed, non-configurable rule आहे जे प्रत्येक session, प्रत्येक channel,
आणि प्रत्येक agent ला applies -- कोणतेही exceptions नाहीत आणि LLM override नाही.

**Rule:** Data फक्त **equal किंवा higher** classification level च्या channels आणि
recipients ला flow करू शकतो.

हे single rule data leakage scenarios च्या एका entire class ला रोखतो, accidental
oversharing पासून sensitive information exfiltrate करण्यासाठी designed sophisticated
prompt injection attacks पर्यंत.

## Classification कसे Flows होते

Triggerfish चार classification levels वापरतो (highest to lowest):

<img src="/diagrams/write-down-rules.svg" alt="Write-down rules: data flows only to equal or higher classification levels" style="max-width: 100%;" />

दिलेल्या level वर classified data त्या level ला किंवा त्यापेक्षा वरील कोणत्याही
level ला flow करू शकतो. ते कधीच downward flow करू शकत नाही. हा no-write-down rule आहे.

::: danger No-write-down rule **fixed आणि non-configurable** आहे. Administrators
ते relax करू शकत नाहीत, policy rules override करू शकत नाहीत, किंवा LLM bypass
करू शकत नाही. हे architectural foundation आहे ज्यावर इतर सर्व security controls
rest करतात. :::

## Effective Classification

Data system सोडण्याच्या आधी, Triggerfish destination चे **effective classification**
compute करतो:

```
EFFECTIVE_CLASSIFICATION = min(channel_classification, recipient_classification)
```

दोन्ही channel आणि recipient data च्या classification level वर किंवा त्यापेक्षा
वर असणे आवश्यक आहे. कोणतेही एक खाली असल्यास, output blocked आहे.

| Channel              | Recipient                     | Effective Classification |
| -------------------- | ----------------------------- | ------------------------ |
| INTERNAL (Slack)     | INTERNAL (coworker)           | INTERNAL                 |
| INTERNAL (Slack)     | EXTERNAL (vendor)             | PUBLIC                   |
| CONFIDENTIAL (Slack) | INTERNAL (coworker)           | INTERNAL                 |
| CONFIDENTIAL (Email) | EXTERNAL (personal contact)   | PUBLIC                   |

::: info EXTERNAL recipient असलेल्या CONFIDENTIAL channel चे effective classification
PUBLIC आहे. Session ने PUBLIC च्या वर कोणताही data access केला असल्यास, output
blocked आहे. :::

## Real-World Example

No-write-down rule action मध्ये दाखवणारे concrete scenario येथे आहे.

```
User: "Check my Salesforce pipeline"

Agent: [user च्या delegated token द्वारे Salesforce access करतो]
       [Salesforce data CONFIDENTIAL म्हणून classified]
       [session taint CONFIDENTIAL ला escalates]

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

User ने Salesforce data (CONFIDENTIAL classified) access केले, ज्याने संपूर्ण session
taint केले. जेव्हा त्यांनी external contact ला message पाठवण्याचा प्रयत्न केला
(effective classification PUBLIC), policy layer output blocked केले कारण CONFIDENTIAL
data PUBLIC destination ला flow करू शकत नाही.

::: tip बायकोला एजंटचा message ("I'll be late tonight") स्वतःमध्ये Salesforce data
contain करत नाही. पण session आधीच्या Salesforce access द्वारे tainted झाला आहे,
आणि संपूर्ण session context -- Salesforce response मधून LLM ने काय retain केले
असेल त्यासह -- output influence करू शकते. No-write-down rule context leakage च्या
या entire class ला रोखतो. :::

## User ला काय दिसते

जेव्हा no-write-down rule action block करतो, तेव्हा user एक clear, actionable
message receive करतो. Triggerfish दोन response modes offer करतो:

**Default (specific):**

```
I can't send confidential data to a public channel.

-> Reset session and send message
-> Cancel
```

**Educational (opt-in via configuration):**

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

दोन्ही cases मध्ये, user ला clear options दिले जातात. त्यांना कधीच काय झाले किंवा
ते काय करू शकतात याबद्दल confused सोडले जात नाही.

## Session Reset

जेव्हा user "Reset session and send message" निवडतो, Triggerfish एक **full reset**
perform करतो:

1. Session taint PUBLIC ला cleared
2. संपूर्ण conversation history cleared होतो (context leakage रोखणे)
3. Requested action fresh session विरुद्ध re-evaluated
4. Action आता permitted असल्यास (PUBLIC data PUBLIC channel ला), ते proceed करतो

::: warning SECURITY Session reset taint **आणि** conversation history दोन्ही
clear करते. हे optional नाही. Taint label cleared केले पण conversation context
remained असल्यास, LLM आधीच्या messages मधील classified information reference
करू शकतो, reset चा purpose defeat करतो. :::

## Enforcement कसे काम करते

No-write-down rule `PRE_OUTPUT` hook वर enforced आहे -- system मधून कोणताही data
जाण्यापूर्वी शेवटचे enforcement point. Hook synchronous, deterministic code म्हणून
run होतो:

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

हा code असा आहे:

- **Deterministic** -- same inputs नेहमी same decision produce करतात
- **Synchronous** -- hook कोणताही output पाठवण्यापूर्वी complete होतो
- **Unforgeable** -- LLM hook चा decision influence करू शकत नाही
- **Logged** -- प्रत्येक execution full context सह recorded आहे

## Session Taint आणि Escalation

Session taint session दरम्यान accessed data चे highest classification level track
करतो. दोन strict rules follow करते:

1. **Escalation only** -- taint session मध्ये increase होऊ शकतो, कधीच decrease नाही
2. **Automatic** -- data session मध्ये enter झाल्यावर `POST_TOOL_RESPONSE` hook
   द्वारे taint updated होतो

| Action                            | Taint Before | Taint After              |
| --------------------------------- | ------------ | ------------------------ |
| Weather API access (PUBLIC)       | PUBLIC       | PUBLIC                   |
| Internal wiki access (INTERNAL)   | PUBLIC       | INTERNAL                 |
| Salesforce access (CONFIDENTIAL)  | INTERNAL     | CONFIDENTIAL             |
| Weather API पुन्हा access (PUBLIC) | CONFIDENTIAL | CONFIDENTIAL (unchanged) |

Session एकदा CONFIDENTIAL ला reach झाल्यावर, user explicitly reset करेपर्यंत
CONFIDENTIAL राहतो. कोणतेही automatic decay नाही, timeout नाही, आणि LLM taint
lower करण्याचा कोणताही मार्ग नाही.

## हा Rule Fixed का आहे

No-write-down rule configurable नाही कारण ते configurable केल्याने संपूर्ण security
model undermine होईल. Administrator exception create करू शकल्यास -- "या एका
integration साठी CONFIDENTIAL data PUBLIC channels ला flow करू द्या" -- ती exception
attack surface बनते.

Triggerfish मधील प्रत्येक इतर security control या assumption वर builds केले आहे
की no-write-down rule absolute आहे. Session taint, data lineage, agent delegation
ceilings, आणि audit logging सर्व त्यावर depend करतात. ते configurable केल्याने
संपूर्ण architecture rethink करणे आवश्यक होईल.

::: info Administrators channels, recipients, आणि integrations ला assigned
classification levels **configure करू शकतात**. Channel higher-classified data
receive करायचे असल्यास, channel higher level वर classify करा. Rule स्वतः fixed
राहतो; rule चे inputs configurable आहेत. :::

## Related Pages

- [Security-First Design](./) -- security architecture चे overview
- [Identity & Auth](./identity) -- channel identity कसे established आहे
- [Audit & Compliance](./audit-logging) -- blocked actions कसे recorded होतात
- [Architecture: Taint & Sessions](/mr-IN/architecture/taint-and-sessions) -- session taint mechanics in detail
