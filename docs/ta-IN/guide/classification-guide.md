# வகைப்படுத்தல் நிலைகளை தேர்வு செய்தல்

Triggerfish இல் உள்ள ஒவ்வொரு சேனலும், MCP server உம், integration உம், plugin உம் வகைப்படுத்தல் நிலை வைத்திருக்க வேண்டும். இந்த பக்கம் சரியானதை தேர்வு செய்ய உதவுகிறது.

## நான்கு நிலைகள்

| நிலை             | அர்த்தம்                                              | தரவு ஓடுகிறது...                   |
| ---------------- | ----------------------------------------------------- | ---------------------------------- |
| **PUBLIC**       | யாரும் பார்க்க பாதுகாப்பானது                         | எங்கும்                            |
| **INTERNAL**     | உங்கள் கண்களுக்கு மட்டும் — முக்கியமானதல்ல, ஆனால் பொதுவல்ல | INTERNAL, CONFIDENTIAL, RESTRICTED |
| **CONFIDENTIAL** | ஒருபோதும் கசிய விரும்பாத முக்கியமான தரவு             | CONFIDENTIAL, RESTRICTED           |
| **RESTRICTED**   | மிகவும் முக்கியமானது — சட்ட, மருத்துவ, நிதி, PII      | RESTRICTED மட்டும்                 |

தரவு **மேலே அல்லது பக்கவாட்டில்** மட்டும் ஓட முடியும், கீழே ஒருபோதும் இல்லை. இது [no-write-down விதி](/ta-IN/security/no-write-down) மற்றும் இதை override செய்ய முடியாது.

## கேட்க வேண்டிய இரண்டு கேள்விகள்

நீங்கள் கட்டமைக்கும் எந்த integration க்கும் கேளுங்கள்:

**1. இந்த மூலம் திரும்ப அனுப்பக்கூடிய மிகவும் முக்கியமான தரவு என்ன?**

இது **குறைந்தபட்ச** வகைப்படுத்தல் நிலையை தீர்மானிக்கிறது. ஒரு MCP server நிதி தரவை திரும்ப அனுப்பக்கூடும் என்றால், அது குறைந்தபட்சம் CONFIDENTIAL ஆக இருக்க வேண்டும் -- அதன் பெரும்பாலான tools பாதிப்பில்லாத metadata திரும்ப அனுப்பினாலும்.

**2. session தரவு இந்த இலக்கிற்கு ஓடுவது சரியா என்று நான் உணர்கிறேனா?**

இது நீங்கள் ஒதுக்க விரும்பும் **அதிகபட்ச** வகைப்படுத்தல் நிலையை தீர்மானிக்கிறது. அதிக வகைப்படுத்தல் என்றால் அதை பயன்படுத்தும்போது session taint உயர்கிறது, இது பின்னர் தரவு எங்கே ஓட முடியும் என்பதை கட்டுப்படுத்துகிறது.

## தரவு வகையின்படி வகைப்படுத்தல்

| தரவு வகை                                          | பரிந்துரைக்கப்பட்ட நிலை | ஏன்                                           |
| -------------------------------------------------- | ----------------------- | --------------------------------------------- |
| வானிலை, பொது web பக்கங்கள், நேர மண்டலங்கள்       | **PUBLIC**              | யாருக்கும் சுதந்திரமாக கிடைக்கும்            |
| உங்கள் தனிப்பட்ட குறிப்புகள், bookmarks, task lists | **INTERNAL**          | தனிப்பட்டது ஆனால் வெளிப்பட்டாலும் சேதமில்லை |
| உள் wikis, team docs, project boards              | **INTERNAL**            | நிறுவன-உள் தகவல்                             |
| Email, calendar events, contacts                  | **CONFIDENTIAL**        | பெயர்கள், அட்டவணைகள், உறவுகள் உட்படுகிறது   |
| CRM data, sales pipeline, customer records        | **CONFIDENTIAL**        | வணிக-முக்கியமானது, customer தரவு             |
| நிதி பதிவுகள், வங்கி கணக்குகள், invoices         | **CONFIDENTIAL**        | பணத்தகவல்                                    |
| Source code repositories (private)                | **CONFIDENTIAL**        | intellectual property                         |
| மருத்துவ அல்லது health records                     | **RESTRICTED**          | சட்டப்பூர்வமாக பாதுகாக்கப்பட்டது (HIPAA, போன்றவை) |
| அரசு ID எண்கள், SSNs, passports                  | **RESTRICTED**          | அடையாளம் திருட்டு அபாயம்                    |
| சட்ட ஆவணங்கள், NDA கீழ் ஒப்பந்தங்கள்            | **RESTRICTED**          | சட்ட வெளிப்பாடு                             |
| Encryption விசைகள், credentials, secrets           | **RESTRICTED**          | கணினி சமரசம் அபாயம்                         |

## MCP Servers

`triggerfish.yaml` க்கு ஒரு MCP server சேர்க்கும்போது, வகைப்படுத்தல் இரண்டு விஷயங்களை தீர்மானிக்கிறது:

1. **Session taint** — இந்த server இல் எந்த tool அழைத்தாலும் session இந்த நிலைக்கு உயர்கிறது
2. **Write-down prevention** — இந்த நிலைக்கு மேல் tainted session இந்த server க்கு தரவை அனுப்ப முடியாது

```yaml
mcp_servers:
  # PUBLIC — திறந்த தரவு, உணர்திறன் இல்லை
  weather:
    command: npx
    args: ["-y", "@mcp/server-weather"]
    classification: PUBLIC

  # INTERNAL — உங்கள் சொந்த filesystem, தனிப்பட்டது ஆனால் secrets இல்லை
  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/you/docs"]
    classification: INTERNAL

  # CONFIDENTIAL — private repos, customer issues அணுகுகிறது
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  # RESTRICTED — PII, medical records, legal docs உடன் database
  postgres:
    command: npx
    args: ["-y", "@mcp/server-postgres"]
    env:
      DATABASE_URL: "keychain:prod-db-url"
    classification: RESTRICTED
```

::: warning DEFAULT DENY `classification` விட்டுவிட்டால், server **UNTRUSTED** ஆக பதிவு செய்யப்படுகிறது மற்றும் gateway அனைத்து tool அழைப்புகளையும் நிராகரிக்கிறது. வெளிப்படையாக ஒரு நிலை தேர்வு செய்ய வேண்டும். :::

### பொதுவான MCP Server வகைப்படுத்தல்கள்

| MCP Server                     | பரிந்துரைக்கப்பட்ட நிலை | காரணம்                                             |
| ------------------------------ | ----------------------- | -------------------------------------------------- |
| Filesystem (public docs)       | PUBLIC                  | பொதுவாக கிடைக்கும் கோப்புகளை மட்டும் வெளிப்படுத்துகிறது |
| Filesystem (home directory)    | INTERNAL                | தனிப்பட்ட கோப்புகள், ரகசியமில்லை                  |
| Filesystem (work projects)     | CONFIDENTIAL            | proprietary கோட் அல்லது தரவு இருக்கலாம்           |
| GitHub (public repos only)     | INTERNAL                | கோட் பொதுவானது ஆனால் பயன்பாட்டு முறைகள் தனிப்பட்டவை |
| GitHub (private repos)         | CONFIDENTIAL            | Proprietary source கோட்                           |
| Slack                          | CONFIDENTIAL            | Workplace உரையாடல்கள், சாத்தியமாக முக்கியமானவை   |
| Database (analytics/reporting) | CONFIDENTIAL            | ஒருங்கிணைந்த வணிக தரவு                           |
| Database (production with PII) | RESTRICTED              | தனிப்படுத்தக்கூடிய தகவல் உட்படுகிறது             |
| Weather / time / calculator    | PUBLIC                  | முக்கியமான தரவில்லை                               |
| Web search                     | PUBLIC                  | பொதுவாக கிடைக்கும் தகவல் திரும்பி வருகிறது       |
| Email                          | CONFIDENTIAL            | பெயர்கள், உரையாடல்கள், attachments               |
| Google Drive                   | CONFIDENTIAL            | Documents முக்கியமான வணிக தரவு இருக்கலாம்        |

## Channels

Channel வகைப்படுத்தல் **ceiling** ஐ தீர்மானிக்கிறது — அந்த சேனலில் வழங்கக்கூடிய தரவின் அதிகபட்ச உணர்திறன்.

```yaml
channels:
  cli:
    classification: INTERNAL # உங்கள் உள்ளூர் terminal — உள் தரவுக்கு பாதுகாப்பானது
  telegram:
    classification: INTERNAL # உங்கள் private bot — owner க்கு CLI போலவே
  webchat:
    classification: PUBLIC # அநாமதேய visitors — பொதுவான தரவு மட்டும்
  email:
    classification: CONFIDENTIAL # Email தனிப்பட்டது ஆனால் forward செய்யப்படலாம்
```

::: tip OWNER vs. NON-OWNER **owner** க்கு, அனைத்து சேனல்களும் ஒரே நம்பிக்கை நிலையை வைத்திருக்கின்றன — நீங்கள் நீங்களே, எந்த app பயன்படுத்தினாலும். Channel வகைப்படுத்தல் **non-owner பயனர்களுக்கு** மிகவும் முக்கியம் (webchat visitors, Slack channel members, போன்றவர்கள்) அவர்களுக்கு என்ன தரவு ஓட முடியும் என்பதை gate செய்கிறது. :::

### Channel வகைப்படுத்தல் தேர்வு

| கேள்வி                                                                        | ஆம் என்றால்...         | இல்லை என்றால்...       |
| ----------------------------------------------------------------------------- | ----------------------- | ----------------------- |
| இந்த சேனலில் ஒரு அந்நியர் செய்திகளை பார்க்கலாமா?                           | **PUBLIC**              | தொடர்ந்து படிக்கவும்   |
| இந்த சேனல் உங்களுக்கு மட்டுமே?                                              | **INTERNAL** அல்லது அதிகம் | தொடர்ந்து படிக்கவும் |
| செய்திகள் forward செய்யப்படலாம், screenshot எடுக்கப்படலாம் அல்லது மூன்றாம் தரப்பால் log ஆகலாமா? | Cap at **CONFIDENTIAL** | **RESTRICTED** ஆகலாம் |
| சேனல் end-to-end encrypted மற்றும் உங்கள் முழு கட்டுப்பாட்டில் உள்ளதா?     | **RESTRICTED** ஆகலாம்  | Cap at **CONFIDENTIAL** |

## தவறு செய்தால் என்ன நடக்கும்

**மிகவும் குறைவாக (உதா., CONFIDENTIAL server ஐ PUBLIC என்று குறிக்கும்போது):**

- இந்த server இலிருந்து தரவு session taint ஐ உயர்த்தாது
- Session வகைப்படுத்தப்பட்ட தரவை பொது சேனல்களுக்கு ஓட்டலாம் — **தரவு கசிவு அபாயம்**
- இது ஆபத்தான திசை

**மிகவும் அதிகமாக (உதா., PUBLIC server ஐ CONFIDENTIAL என்று குறிக்கும்போது):**

- இந்த server பயன்படுத்தும்போது Session taint தேவையின்றி உயர்கிறது
- பின்னர் குறைந்த வகைப்படுத்தல் சேனல்களுக்கு அனுப்பும்போது blocked ஆவீர்கள்
- எரிச்சலூட்டுவது ஆனால் **பாதுகாப்பானது** — அதிகமாக classify செய்யுங்கள்

::: danger சந்தேகம் இருக்கும்போது, **அதிகமாக classify செய்யுங்கள்**. server உண்மையில் என்ன தரவு திரும்ப அனுப்புகிறது என்று பரிசீலித்த பிறகு எப்போது வேண்டுமானாலும் குறைக்கலாம். குறைவாக classify செய்வது பாதுகாப்பு அபாயம்; அதிகமாக classify செய்வது வெறும் அசௌகரியம் மட்டுமே. :::

## Taint Cascade

நடைமுறை தாக்கம் புரிந்துகொண்டால் சரியாக தேர்வு செய்ய உதவுகிறது. ஒரு session இல் என்ன நடக்கிறது என்று இதோ:

```
1. Session PUBLIC ல் தொடங்குகிறது
2. வானிலையைப் பற்றி கேட்கிறீர்கள் (PUBLIC server)     → taint PUBLIC ஆக இருக்கிறது
3. உங்கள் குறிப்புகளை சரிபாருங்கள் (INTERNAL filesystem)    → taint INTERNAL க்கு உயர்கிறது
4. GitHub issues query செய்யுங்கள் (CONFIDENTIAL)        → taint CONFIDENTIAL க்கு உயர்கிறது
5. webchat க்கு post செய்ய முயற்சிக்கிறீர்கள் (PUBLIC channel)   → BLOCKED (write-down violation)
6. session reset செய்கிறீர்கள்                         → taint PUBLIC க்கு திரும்புகிறது
7. webchat க்கு post செய்கிறீர்கள்                     → அனுமதிக்கப்பட்டது
```

CONFIDENTIAL tool பயன்படுத்திய பிறகு அடிக்கடி PUBLIC சேனல் பயன்படுத்தினால், அடிக்கடி reset செய்வீர்கள். tool க்கு உண்மையிலேயே CONFIDENTIAL தேவையா, அல்லது சேனலை மறுவகைப்படுத்தலாமா என்று சிந்தியுங்கள்.

## Filesystem Paths

உங்கள் agent கலந்த உணர்திறன் கொண்ட directories க்கு அணுகல் இருக்கும்போது, தனிப்பட்ட filesystem paths ஐயும் வகைப்படுத்தலாம்:

```yaml
filesystem:
  default: INTERNAL
  paths:
    "/home/you/public": PUBLIC
    "/home/you/work/clients": CONFIDENTIAL
    "/home/you/legal": RESTRICTED
```

## மதிப்பாய்வு checklist

புதிய integration live ஆவதற்கு முன்:

- [ ] இந்த மூலம் திரும்ப அனுப்பக்கூடிய மோசமான தரவு என்ன? அந்த நிலையில் classify செய்யுங்கள்.
- [ ] வகைப்படுத்தல் குறைந்தபட்சம் தரவு வகை அட்டவணை பரிந்துரைக்கும் அளவு உள்ளதா?
- [ ] இது ஒரு சேனல் என்றால், அனைத்து சாத்தியமான பெறுநர்களுக்கும் வகைப்படுத்தல் பொருத்தமானதா?
- [ ] உங்கள் பொதுவான workflow க்கு taint cascade சரியாக செயல்படுகிறதா என்று சரிபார்த்தீர்களா?
- [ ] சந்தேகம் இருக்கும்போது, குறைவாக classify செய்வதற்கு பதிலாக அதிகமாக classify செய்தீர்களா?

## தொடர்புடைய பக்கங்கள்

- [No Write-Down விதி](/ta-IN/security/no-write-down) — நிலையான தரவு ஓட்ட விதி
- [கட்டமைப்பு](/ta-IN/guide/configuration) — முழு YAML மேற்கோள்
- [MCP Gateway](/ta-IN/integrations/mcp-gateway) — MCP server பாதுகாப்பு மாதிரி
