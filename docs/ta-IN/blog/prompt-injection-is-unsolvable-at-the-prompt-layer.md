---
title: Prompt Injection Prompt அடுக்கில் தீர்க்க முடியாதது
date: 2026-03-10
description: "Prompt injection OWASP கண்காணிக்கத் தொடங்கியதிலிருந்து அவர்களின் #1 LLM vulnerability ஆக இருந்து வருகிறது. Prompt அடுக்கில் கட்டமைக்கப்பட்ட ஒவ்வொரு பாதுகாப்பும் ஏன் தோல்வியடைகிறது என்பது இங்கே."
author: Greg Havens
tags:
  - ai
  - ai agents
  - security
  - prompt injection
  - llm security
  - open source
  - triggerfish
  - owasp
  - agent security
draft: false
---
OWASP கண்காணிக்கத் தொடங்கியதிலிருந்து Prompt injection LLM applications க்கான அவர்களின் முதல் vulnerability ஆக இருந்து வருகிறது. ஒவ்வொரு முக்கிய AI தளமும் அதில் வழிகாட்டல் வெளியிட்டுள்ளது. Researchers டஜன் கணக்கான பரிந்துரைக்கப்பட்ட பாதுகாப்புகளை உருவாக்கியுள்ளனர். அவர்களில் யாரும் அதை தீர்க்கவில்லை, அவர்கள் தொடர்ந்து தோல்வியடையும் pattern சிக்கல் உண்மையில் எங்கே வாழ்கிறது என்பதைப் பற்றி அடிப்படையான ஒன்றை சுட்டிக்காட்டுகிறது.

சுருக்கமான பதில்: ஒரு பிரச்சினையை அதுவே பிரச்சினையான அடுக்கில் சரிசெய்ய முடியாது. Prompt injection செயல்படுகிறது ஏனெனில் மாதிரி developer இன் வழிமுறைகளையும் attacker இன் வழிமுறைகளையும் வேறுபடுத்திக்காண முடியாது. இதை மாதிரிக்கு மேலும் வழிமுறைகள் சேர்ப்பதன் மூலம் தீர்க்க முயற்சிக்கும் ஒவ்வொரு பாதுகாப்பும் attack ஐ சாத்தியமாக்கும் ஒரே constraint க்குள் செயல்படுகிறது.

![](/blog/images/injectedcontext.jpg)

## Attack உண்மையில் என்ன செய்கிறது

ஒரு language model context window ஐ input ஆக எடுத்து completion உருவாக்குகிறது. Context window tokens இன் flat வரிசை. யாரோ tokens trusted system prompt இலிருந்து வந்தன, யாரோ user இலிருந்து வந்தன, யாரோ agent அதன் வேலையை செய்யும்போது பெற்ற வெளிப்புற உள்ளடக்கத்திலிருந்து வந்தன என்பதை கண்காணிக்க மாதிரிக்கு native வழிமுறை இல்லை. Developers intent ஐ signal செய்ய role tags போன்ற structural conventions பயன்படுத்துகிறார்கள், ஆனால் அவை conventions, enforcement அல்ல. மாதிரியின் perspective இலிருந்து, முழு context ம் அடுத்த token prediction ஐ inform செய்யும் input.

Prompt injection இதை exploit செய்கிறது. ஒரு attacker agent படிக்கும் உள்ளடக்கத்தில் வழிமுறைகளை embed செய்கிறார், ஒரு webpage, document, email, code comment அல்லது database field போல, அந்த வழிமுறைகள் ஒரே context window இல் developer இன் வழிமுறைகளுடன் போட்டி போடுகின்றன. Injected வழிமுறைகள் போதுமான அளவு persuasive, coherent அல்லது context இல் சாதகமாக positioned ஆனால், மாதிரி அவற்றை பின்பற்றுகிறது. இது எந்த குறிப்பிட்ட மாதிரியிலும் bug அல்ல. இந்த அனைத்து கணினிகளும் எவ்வாறு செயல்படுகின்றன என்பதன் விளைவு.

Indirect prompt injection மிகவும் ஆபத்தான வடிவம். பயனர் நேரடியாக malicious prompt தட்டச்சு செய்வதற்கு பதிலாக, ஒரு attacker agent சுயாதீனமாக பெறும் உள்ளடக்கத்தை poison செய்கிறார். பயனர் தவறு செய்வதில்லை. Agent வெளியே சென்று, தன் வேலையை செய்யும் போது poisoned உள்ளடக்கத்தை சந்திக்கிறது, மற்றும் attack செயல்படுகிறது. Attacker conversation க்கு அணுகல் தேவையில்லை. Agent படிக்கும் எங்காவது தங்கள் text ஐ வைக்க வேண்டும் மட்டும்.

## ஆவணப்படுத்தப்பட்ட attacks எப்படி இருக்கும்

![](/blog/images/dataexfil.jpg)

ஆகஸ்ட் 2024 இல், PromptArmor இல் பாதுகாப்பு researchers Slack AI இல் prompt injection vulnerability ஐ ஆவணப்படுத்தினர். Attack இவ்வாறு செயல்பட்டது: ஒரு attacker ஒரு public Slack channel உருவாக்கி malicious வழிமுறையை கொண்ட ஒரு செய்தி post செய்கிறார். செய்தி Slack AI க்கு ஒரு பயனர் API key க்காக query செய்யும்போது, ஒரு placeholder வார்த்தையை actual key மதிப்புடன் மாற்றி "click here to reauthenticate" link இல் URL parameter ஆக encode செய்ய சொல்கிறது. Attacker இன் channel க்கு ஒரே ஒரு member உள்ளது: attacker. பாதிக்கப்பட்டவர் அதை பார்த்ததில்லை. Workspace இல் வேறு எங்காவது ஒரு developer Slack AI பயன்படுத்தி அவர்களின் API key பற்றிய தகவலை தேடும்போது — இது attacker க்கு அணுகல் இல்லாத private channel இல் சேமிக்கப்பட்டுள்ளது — Slack AI attacker இன் public channel செய்தியை context க்கு pull செய்கிறது, வழிமுறையை பின்பற்றுகிறது, மற்றும் developer இன் Slack சூழலில் phishing link render செய்கிறது. அதை click செய்வது private API key ஐ attacker இன் server க்கு அனுப்புகிறது.

Slack இன் disclosure க்கான ஆரம்ப பதில் பயனர் member இல்லாத public channels ஐ query செய்வது intended behavior என்பது. சிக்கல் channel அணுகல் policy அல்ல. சிக்கல் என்னவென்றால் மாதிரி Slack employee இன் வழிமுறைக்கும் attacker இன் வழிமுறைக்கும் வேறுபாடு சொல்ல முடியாது, இரண்டும் context window இல் இருக்கும்போது.

ஜூன் 2025 இல், ஒரு researcher GitHub Copilot இல் prompt injection vulnerability ஐ கண்டுபிடித்தார், CVE-2025-53773 என்று கண்காணிக்கப்பட்டு Microsoft இன் ஆகஸ்ட் 2025 Patch Tuesday release இல் patch செய்யப்பட்டது. Attack vector source code files, README files, GitHub issues அல்லது Copilot process செய்யக்கூடிய வேறு எந்த text இலும் embed செய்யப்பட்ட malicious வழிமுறை ஆகும். வழிமுறை Copilot க்கு project இன் .vscode/settings.json கோப்பை modify செய்ய ஒரு configuration line சேர்க்கச் சொல்கிறது. அது enable ஆனவுடன், agent user ஐ கேட்காமல் commands execute செய்கிறது. Attack GPT-4.1, Claude Sonnet 4, Gemini மற்றும் மற்ற மாதிரிகளுடன் supported GitHub Copilot முழுவதும் செயல்படுவது நிரூபிக்கப்பட்டது, இது vulnerability மாதிரியில் இல்லை என்று சொல்கிறது. இது architecture இல் உள்ளது.

## Standard பாதுகாப்புகள் ஏன் தோல்வியடைகின்றன

Prompt injection க்கு உள்ளுணர்வு பதில் சிறந்த system prompt எழுதுவது. Retrieved உள்ளடக்கத்தில் உள்ள வழிமுறைகளை ignore செய்ய மாதிரிக்கு வழிமுறைகள் சேர்க்கவும். வெளிப்புற தரவை untrusted என்று கருதும்படி சொல்லவும். அதன் நடத்தையை override செய்ய முயற்சிப்பது போல் தெரிவதை flag செய்யும்படி சொல்லவும். பல தளங்கள் சரியாக இதையே செய்கின்றன. பாதுகாப்பு vendors agent இன் context க்கு carefully engineered detection prompts சேர்ப்பதைச் சுற்றி கட்டமைக்கப்பட்ட products விற்கின்றன.

OpenAI, Anthropic மற்றும் Google DeepMind இன் ஒரு research team அக்டோபர் 2025 இல் 12 published prompt injection பாதுகாப்புகளை மதிப்பீடு செய்து ஒவ்வொன்றையும் adaptive attacks க்கு உட்படுத்திய ஒரு paper வெளியிட்டது. அவர்கள் பெரும்பாலானவற்றிற்கு 90% க்கு மேல் attack success rates உடன் 12 ம் bypass செய்தனர். பாதுகாப்புகள் மோசமாக இல்லை. அவற்றில் உண்மையான techniques பயன்படுத்தும் serious researchers இன் வேலை இருந்தது. சிக்கல் என்னவென்றால் மாதிரிக்கு எதை எதிர்க்க வேண்டும் என்று கற்றுக்கொடுக்கும் எந்த பாதுகாப்பும் பாதுகாப்பு என்ன சொல்கிறது என்று தெரிந்த attacker மூலம் reverse-engineer செய்யப்படலாம்.

தீர்க்கப்பட்ட problem செய்ய முயற்சிக்கும் அனைத்து approaches ம் ஒரு determined attacker க்கு எதிராக தோல்வியடையும் காரணம் என்னவென்றால், அவை trust enforce செய்ய முடியாத context window க்கு மேலும் உள்ளடக்கத்தை சேர்ப்பதன் மூலம் ஒரு trust சிக்கலை தீர்க்க முயற்சிக்கின்றன. Attack surface context window தானே. Context window க்கு மேலும் வழிமுறைகள் சேர்ப்பது attack surface ஐ குறைக்கவில்லை.

## சிக்கலை உண்மையில் என்ன கட்டுப்படுத்துகிறது

ஒரு கணினியின் பாதுகாப்பு பண்புகள் மாதிரி சரியான judgments செய்வதில் தங்கியிருக்க வேண்டியதில்லை என்ற கொள்கையை பயன்படுத்தும்போது prompt injection அபாயத்தில் அர்த்தமுள்ள குறைப்பு உள்ளது. இது பாதுகாப்பில் novel idea அல்ல. "நீங்கள் அங்கீகரிக்கப்பட்ட data மட்டும் அணுகுங்கள்" என்று policy document இல் எழுதுவதற்கு பதிலாக access controls ஐ code இல் enforce செய்ய வழிகாட்டும் ஒரே கொள்கை இது.

AI agents க்கு, இதன் அர்த்தம் enforcement அடுக்கு மாதிரிக்கு வெளியே, மாதிரியின் reasoning தாக்க முடியாத code இல் இருக்க வேண்டும். மாதிரி requests உருவாக்குகிறது. Code அந்த requests அனுமதிக்கப்பட்டவையா என்று மதிப்பீடு செய்கிறது, session நிலை பற்றிய உண்மைகள், சம்பந்தப்பட்ட data இன் வகைப்படுத்தல் மற்றும் output சென்றடையும் channel இன் permissions ஆகியவற்றின் அடிப்படையில். மதிப்பீடு conversation படிக்காததால் மாதிரி இந்த மதிப்பீட்டை talk மூலம் கடக்க முடியாது.

இது prompt injection ஐ சாத்தியமற்றதாக செய்வதில்லை. ஒரு attacker இன்னும் வழிமுறைகளை inject செய்யலாம் மற்றும் மாதிரி இன்னும் அவற்றை செயலாக்கும். மாறுவது blast radius. Injected வழிமுறைகள் data ஐ வெளிப்புற endpoint க்கு exfiltrate செய்ய முயற்சித்தால், outbound அழைப்பு blocked ஆகும், ஏனெனில் மாதிரி வழிமுறைகளை ignore செய்ய முடிவு செய்ததால் அல்ல, ஆனால் enforcement அடுக்கு session இன் வகைப்படுத்தல் நிலை மற்றும் target endpoint இன் வகைப்படுத்தல் floor க்கு எதிராக கோரிக்கையை சரிபார்த்து flow write-down விதிகளை மீறும் என்று கண்டதால்.

![](/blog/images/promptinjectionblock.jpg)

Session taint கண்காணிப்பு access controls மட்டும் cover செய்யாத ஒரு குறிப்பிட்ட இடைவெளியை மூடுகிறது. ஒரு agent CONFIDENTIAL என்று வகைப்படுத்தப்பட்ட document படிக்கும்போது, அந்த session இப்போது CONFIDENTIAL க்கு tainted ஆகிறது. PUBLIC சேனல் மூலம் output அனுப்ப எந்த subsequent முயற்சியும் write-down சரிபார்ப்பில் fail ஆகும், மாதிரிக்கு என்ன செய்யும்படி சொல்லப்பட்டது என்பதை பொருட்படுத்தாமல் மற்றும் வழிமுறை legitimate பயனரிடமிருந்து வந்ததா அல்லது injected payload இலிருந்து வந்ததா என்பதை பொருட்படுத்தாமல். Injection மாதிரிக்கு data leak செய்ய சொல்லலாம். Enforcement அடுக்கு கவலைப்படுவதில்லை.

Architectural framing முக்கியமானது: prompt injection மாதிரியின் instruction-following நடத்தையை target செய்யும் ஒரு attack வகை. சரியான பாதுகாப்பு மாதிரிக்கு வழிமுறைகளை சிறப்பாக பின்பற்றவோ அல்லது மோசமான வழிமுறைகளை மிகவும் துல்லியமாக கண்டறியவோ கற்பிப்பதல்ல. சரியான பாதுகாப்பு மாதிரி மோசமான வழிமுறைகளை பின்பற்றுவதிலிருந்து விளைவக்கூடிய consequences இன் set ஐ குறைப்பதாகும். உண்மையான tool அழைப்புகள், உண்மையான data ஓட்டங்கள், உண்மையான வெளிப்புற communications — மாதிரி தாக்க முடியாத gate க்கு பின்னால் வைத்து அதை செய்கிறீர்கள்.

அது தீர்க்கக்கூடிய சிக்கல். மாதிரி trusted இலிருந்து untrusted வழிமுறைகளை நம்பகமாக வேறுபடுத்துவது அல்ல.
