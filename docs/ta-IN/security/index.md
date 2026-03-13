# பாதுகாப்பு-முதல் Design

Triggerfish ஒரே அடிப்படையில் கட்டமைக்கப்பட்டுள்ளது: **LLM க்கு பூஜ்ய அதிகாரம் உள்ளது**. அது செயல்களை கோருகிறது; policy அடுக்கு முடிவு செய்கிறது. ஒவ்வொரு பாதுகாப்பு முடிவும் AI க்கு bypass, override அல்லது தாக்க முடியாத நிர்ணயவாத code மூலம் எடுக்கப்படுகிறது.

இந்த பக்கம் Triggerfish இந்த approach ஏன் எடுக்கிறது, பாரம்பரிய AI agent தளங்களிலிருந்து எவ்வாறு வேறுபடுகிறது மற்றும் பாதுகாப்பு மாதிரியின் ஒவ்வொரு கூறைப் பற்றிய விவரங்களை எங்கே கண்டுபிடிப்பது என்பதை விளக்குகிறது.

## பாதுகாப்பு LLM க்கு கீழே இருக்க வேண்டும் என்பது ஏன்

Large language models prompt-injected ஆகலாம். ஒரு கவனமாக craft செய்யப்பட்ட input -- ஒரு malicious வெளிப்புற செய்தி, poisoned document அல்லது சமரசம் ஆன tool response இலிருந்து இருந்தாலும் -- ஒரு LLM அதன் வழிமுறைகளை ignore செய்து செய்யக்கூடாது என்று சொல்லப்பட்ட செயல்களை செய்ய வைக்கலாம். இது கோட்பாட்டு அபாயம் அல்ல. இது AI industry இல் நன்கு ஆவணப்படுத்தப்பட்ட, தீர்க்கப்படாத சிக்கல்.

உங்கள் பாதுகாப்பு மாதிரி LLM விதிகளை பின்பற்றுவதில் தங்கியிருந்தால், ஒரு வெற்றிகரமான injection நீங்கள் கட்டமைத்த ஒவ்வொரு safeguard ஐயும் bypass செய்யலாம்.

Triggerfish அனைத்து பாதுகாப்பு அமலாக்கத்தையும் LLM க்கு **கீழே** அமர்ந்திருக்கும் code அடுக்கிற்கு நகர்த்துவதன் மூலம் இதை தீர்க்கிறது. AI ஒருபோதும் பாதுகாப்பு முடிவுகளை பார்ப்பதில்லை. ஒரு செயல் அனுமதிக்கப்பட வேண்டுமா என்று ஒருபோதும் மதிப்பீடு செய்வதில்லை. வெறுமனே செயல்களை கோருகிறது, மற்றும் policy enforcement அடுக்கு -- தூய, நிர்ணயவாத code ஆக இயங்குகிறது -- அந்த செயல்கள் தொடர்கின்றனவா என்று முடிவு செய்கிறது.

::: warning SECURITY LLM அடுக்கு policy enforcement அடுக்கை override, skip அல்லது தாக்க எந்த வழிமுறையும் இல்லை. "LLM output ஐ bypass கட்டளைகளுக்கு parse செய்" logic இல்லை. பிரிவு architectural, behavioral அல்ல. :::

## முதன்மை Invariant

Triggerfish இல் ஒவ்வொரு design முடிவும் ஒரு invariant இலிருந்து ஓடுகிறது:

> **ஒரே input எப்போதும் ஒரே பாதுகாப்பு முடிவை உருவாக்கும். சீரற்றதன்மை இல்லை, LLM அழைப்புகள் இல்லை, விவேகம் இல்லை.**

இதன் அர்த்தம் பாதுகாப்பு நடத்தை:

- **Auditable** -- எந்த முடிவையும் replay செய்து ஒரே முடிவைப் பெறலாம்
- **Testable** -- நிர்ணயவாத code automated tests மூலம் cover செய்யப்படலாம்
- **Verifiable** -- policy engine open source (Apache 2.0 licensed) மற்றும் யாரும் அதை inspect செய்யலாம்

## பாதுகாப்பு கொள்கைகள்

| கொள்கை                  | அர்த்தம்                                                                                                                          | விவர பக்கம்                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **Data வகைப்படுத்தல்**  | அனைத்து data வும் sensitivity நிலை சுமக்கிறது. Data கணினியில் நுழையும்போது code மூலம் வகைப்படுத்தல் ஒதுக்கப்படுகிறது.           | [Architecture: Classification](/ta-IN/architecture/classification) |
| **No Write-Down**       | Data சம அல்லது அதிக வகைப்படுத்தல் நிலையில் சேனல்கள் மற்றும் பெறுநர்களுக்கு மட்டுமே ஓட முடியும். விதிவிலக்கு இல்லை.           | [No Write-Down விதி](./no-write-down)                        |
| **Session Taint**       | ஒரு session வகைப்படுத்தல் நிலையில் data அணுகும்போது, முழு session அந்த நிலைக்கு tainted ஆகிறது. Taint மட்டுமே உயரலாம்.          | [Architecture: Taint](/ta-IN/architecture/taint-and-sessions)      |
| **நிர்ணயவாத Hooks**     | எட்டு enforcement hooks ஒவ்வொரு data flow இல் முக்கியமான புள்ளிகளில் இயங்குகின்றன. ஒவ்வொரு hook synchronous, logged மற்றும் unforgeable. | [Architecture: Policy Engine](/ta-IN/architecture/policy-engine) |
| **Code இல் அடையாளம்**   | பயனர் அடையாளம் session establishment போது code மூலம் தீர்மானிக்கப்படுகிறது, LLM செய்தி உள்ளடக்கத்தை interpret செய்வதிலிருந்தல்ல. | [Identity & Auth](./identity)                                |
| **Agent Delegation**    | Agent-to-agent அழைப்புகள் cryptographic certificates, classification ceilings மற்றும் depth limits மூலம் govern செய்யப்படுகின்றன. | [Agent Delegation](./agent-delegation)                       |
| **Secrets தனிமைப்படுத்தல்** | Credentials OS keychains அல்லது vaults இல் சேமிக்கப்படுகின்றன, config files இல் ஒருபோதும் இல்லை. | [Secrets Management](./secrets)                              |
| **எல்லாவற்றையும் Audit செய்** | ஒவ்வொரு policy முடிவும் முழு சூழலுடன் log ஆகும்: timestamp, hook type, session ID, input, result மற்றும் மதிப்பீடு செய்யப்பட்ட விதிகள். | [Audit & Compliance](./audit-logging)                        |

## பாரம்பரிய AI Agents vs. Triggerfish

பெரும்பாலான AI agent தளங்கள் பாதுகாப்பை அமல்படுத்த LLM ஐ நம்பிக்கொள்கின்றன. System prompt "முக்கியமான data பகிராதீர்கள்" என்று சொல்கிறது, மற்றும் agent comply செய்ய நம்பப்படுகிறது. இந்த approach க்கு அடிப்படை பலவீனங்கள் உள்ளன.

| அம்சம்                       | பாரம்பரிய AI Agent                    | Triggerfish                                                  |
| ---------------------------- | ------------------------------------- | ------------------------------------------------------------ |
| **பாதுகாப்பு அமலாக்கம்**     | LLM க்கு System prompt வழிமுறைகள்     | LLM க்கு கீழ் நிர்ணயவாத code                                |
| **Prompt injection பாதுகாப்பு** | LLM எதிர்க்கும் என்று நம்பிக்கை    | LLM க்கு முதலிலிருந்தே அதிகாரமில்லை                         |
| **Data flow கட்டுப்பாடு**    | LLM பகிர பாதுகாப்பானது என்று முடிவிடுகிறது | Code இல் Classification labels + no-write-down விதி       |
| **அடையாள சரிபார்ப்பு**        | LLM "நான் admin" என்று interpret செய்கிறது | Code cryptographic channel அடையாளத்தை சரிபார்க்கிறது       |
| **Audit trail**              | LLM conversation logs                 | முழு சூழலுடன் Structured policy decision logs               |
| **Credential அணுகல்**        | அனைத்து பயனர்களுக்கும் System service account | Delegated user credentials; source கணினி permissions வாரிசாகும் |
| **Testability**              | Fuzzy -- prompt wording ஐ பொருந்தியது | நிர்ணயவாதம் -- ஒரே input, ஒரே முடிவு, எப்போதும்           |
| **சரிபார்ப்பிற்கு திறந்தது** | பொதுவாக proprietary                   | Apache 2.0 licensed, முழுமையாக auditable                   |

::: tip Triggerfish LLMs நம்பகமற்றவை என்று கூறவில்லை. இது LLMs பாதுகாப்பு அமலாக்கத்திற்கான தவறான அடுக்கு என்று கூறுகிறது. :::

## ஆழமான பாதுகாப்பு

Triggerfish பதிமூன்று அடுக்கு பாதுகாப்பை செயல்படுத்துகிறது. ஒரு அடுக்கும் தனியாக போதுமானதல்ல; ஒன்றாக, அவை ஒரு பாதுகாப்பு எல்லையை உருவாக்குகின்றன.

[ஆழமான பாதுகாப்பு பற்றி மேலும் படிக்கவும்.](/ta-IN/architecture/defense-in-depth)

## அடுத்த படிகள்

| பக்கம்                                                      | விளக்கம்                                                                            |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [வகைப்படுத்தல் வழிகாட்டி](/ta-IN/guide/classification-guide) | Channels, MCP servers மற்றும் integrations க்கு சரியான நிலை தேர்வு செய்வதற்கான வழிகாட்டி |
| [No Write-Down விதி](./no-write-down)                       | அடிப்படை data flow விதி மற்றும் அது எவ்வாறு அமல்படுத்தப்படுகிறது                    |
| [Identity & Auth](./identity)                               | Channel authentication மற்றும் owner அடையாள சரிபார்ப்பு                            |
| [Agent Delegation](./agent-delegation)                      | Agent-to-agent அடையாளம், certificates மற்றும் delegation chains                     |
| [Secrets Management](./secrets)                             | Triggerfish credentials எவ்வாறு handle செய்கிறது                                   |
| [Audit & Compliance](./audit-logging)                       | Audit trail கட்டமைப்பு, tracing மற்றும் compliance exports                         |
