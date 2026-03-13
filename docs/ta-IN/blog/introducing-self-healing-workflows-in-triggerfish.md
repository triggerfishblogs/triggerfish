---
title: Triggerfish இல் Self-Healing Workflows அறிமுகம்
date: 2026-03-13
description: Triggerfish self-healing workflows ஒவ்வொரு workflow run உடனும் live watcher agent deploy செய்கின்றன, சூழலில் failures ஐ கண்டுபிடித்து execution ஐ நிறுத்தாமல் fixes ஐ முன்மொழிகின்றன.
author: Greg Havens
tags:
  - workflow-automation
  - ai-agents
  - enterprise-it
  - self-healing
  - rpa
  - automation-maintenance
  - triggerfish
draft: false
---
ஒவ்வொரு enterprise automation program ம் ஒரே சுவரை தாக்குகிறது. ServiceNow ticket routing, Terraform drift remediation, certificate rotation, AD group provisioning, SCCM patch deployment, CI/CD pipeline orchestration. முதல் பத்து அல்லது இருபது workflows முதலீட்டை எளிதாக நியாயப்படுத்துகின்றன, மற்றும் workflow எண்ணிக்கை நூறுகளை கடந்து IT team இன் வாரத்தின் ஒரு பகுதி புதிய automation கட்டமைக்கிறதிலிருந்து தற்போதுள்ள automation விழாமல் வைக்கிறதற்கு மாறும் வரை ROI கணிதம் நிலைக்கிறது.

ஒரு payer portal அதன் auth flow ஐ redesign செய்கிறது மற்றும் claims submission workflow authentication நிறுத்துகிறது. Salesforce ஒரு metadata update push செய்கிறது மற்றும் lead-to-opportunity pipeline இல் ஒரு field mapping nulls எழுதத் தொடங்குகிறது. AWS ஒரு API version ஐ deprecate செய்கிறது மற்றும் ஒரு வருடம் clean ஆக run ஆன ஒரு Terraform plan ஒவ்வொரு apply இலும் 400s throw செய்யத் தொடங்குகிறது. யாரோ ஒரு ticket file செய்கிறார்கள், வேறு யாரோ என்ன மாறியது என்று கண்டுபிடிக்கிறார்கள், அதை patch செய்கிறார்கள், சோதிக்கிறார்கள், fix deploy செய்கிறார்கள், இதற்கிடையில் அது automate செய்த process க்கை manually run ஆனது அல்லது run ஆகவில்லை.

இது maintenance trap, மற்றும் இது implementation failure ஐ விட structural. Traditional automation சரியான paths பின்பற்றுகிறது, சரியான patterns பொருத்துகிறது, மற்றும் workflow author செய்யப்பட்டபோது இருந்ததிலிருந்து reality விலகும் தருணம் உடைகிறது. Research consistent: organizations தங்கள் மொத்த automation program செலவில் 70 முதல் 75 சதவீதம் புதிய workflows கட்டமைக்காமல் ஏற்கனவே உள்ளவற்றை maintain செய்வதில் செலவிடுகின்றன. பெரிய deployments இல், 45 சதவீதம் workflows ஒவ்வொரு வாரமும் உடைகின்றன.

Triggerfish இன் workflow engine இதை மாற்ற கட்டமைக்கப்பட்டது. Self-healing workflows இன்று ship ஆகின்றன, மற்றும் அவை இதுவரையிலான தளத்தில் மிக முக்கியமான capability ஐ பிரதிநிதித்துவப்படுத்துகின்றன.

![](/blog/images/watcher-model-diagram.jpg)

## Self-Healing உண்மையில் என்னவென்று அர்த்தம்

இந்த phrase தளர்வாக பயன்படுத்தப்படுகிறது, எனவே இது என்னவென்று நேரடியாக சொல்கிறேன்.

ஒரு Triggerfish workflow இல் self-healing enable செய்யும்போது, அந்த workflow run தொடங்கும் தருணம் ஒரு lead agent spawn ஆகிறது. ஏதோ உடைந்தால் launch ஆவதில்லை; முதல் படியிலிருந்து கவனிக்கிறது, workflow முன்னேறும்போது engine இலிருந்து live event stream பெற்று ஒவ்வொரு படியையும் real time இல் கவனிக்கிறது.

ஒரே ஒரு படி run ஆவதற்கு முன்பே lead க்கு முழு workflow definition தெரியும், ஒவ்வொரு படியின் பின்னால் உள்ள intent, ஒவ்வொரு படியும் அதற்கு முன்னதாக இருந்தவற்றிலிருந்து என்ன எதிர்பார்க்கிறது மற்றும் அதற்கு பிறகு உள்ளவற்றிற்கு என்ன produce செய்கிறது உட்பட. Prior runs இன் வரலாறும் தெரியும்: என்ன வெற்றி அடைந்தது, என்ன தோல்வியடைந்தது, என்ன patches முன்மொழியப்பட்டன மற்றும் ஒரு மனிதர் அவற்றை approve செய்தார்களா reject செய்தார்களா. செயல்பட வேண்டியது ஏதோ இருப்பதை identify செய்யும்போது, அனைத்து context ம் ஏற்கனவே memory இல் உள்ளது, ஏனெனில் நடந்த பிறகு reconstruct செய்வதற்கு பதிலாக முழு நேரமும் கவனித்திருந்தது.

ஏதோ தவறாகும்போது, lead triage செய்கிறது. ஒரு flaky network call backoff உடன் retry பெறுகிறது. Work around செய்யக்கூடிய மாறிய API endpoint இந்த run க்கு work around ஆகும். Workflow definition இல் structural problem ஒரு proposed fix run complete செய்ய apply ஆகும், மாற்றம் permanent ஆவதற்கு முன் உங்கள் approval க்கு submit ஆகும். Broken plugin integration review க்கு submit ஆன புதிய அல்லது updated plugin author ஆகும். Lead தன் முயற்சிகளை exhausting செய்து சிக்கலை resolve செய்ய முடியாவிட்டால், அது என்ன try செய்தது என்றும் root cause என்னவென்று நினைக்கிறது என்றும் structured diagnosis உடன் உங்களிடம் escalate செய்கிறது.

Workflow பாதுகாப்பாக செய்ய முடியும்போதெல்லாம் running ஆக தொடர்கிறது. ஒரு படி blocked ஆனால், அதை depend செய்யும் downstream படிகள் மட்டும் parallel branches தொடரும்போது pause ஆகும். Lead dependency graph தெரியும் மற்றும் உண்மையில் blocked ஆனவற்றை மட்டும் pause செய்கிறது.

## Workflows இல் நீங்கள் கட்டமைக்கும் Context ஏன் முக்கியம்

Self-healing practice இல் செயல்படுவதை செய்வது என்னவென்றால் Triggerfish workflows நீங்கள் எழுதும் தருணத்திலிருந்தே rich step-level metadata தேவைப்படுகின்றன. இது optional அல்ல மற்றும் அதன் சொந்த நலனுக்காக documentation அல்ல; lead agent reason செய்வது இதுதான்.

Workflow இல் ஒவ்வொரு படிக்கும் task definition க்கு அப்பால் நான்கு required fields உள்ளன: படி mechanically என்ன செய்கிறது என்பதன் description, இந்த படி ஏன் இருக்கிறது மற்றும் அது என்ன business purpose serve செய்கிறது என்பதை விளக்கும் intent statement, அது என்ன data பெறுகிறது என்று assume செய்கிறது மற்றும் prior படிகள் எந்த நிலையில் இருக்க வேண்டும் என்பதை விவரிக்கும் expects field, மற்றும் downstream படிகள் consume செய்ய context க்கு என்ன எழுதுகிறது என்பதை விவரிக்கும் produces field.

Lead அந்த intent statement ஐ படி fail ஆகும்போது படிக்கிறது மற்றும் என்ன stake இல் இருக்கிறது என்று புரிந்துகொள்கிறது. Partial record என்றால் access provisioning படிகள் bad inputs உடன் run ஆகும், potentially இரண்டு நாட்களில் தொடங்கும் உண்மையான நபருக்கு wrong permissions வழங்கலாம் என்று தெரியும். அந்த context அது எவ்வாறு recover செய்ய முயற்சிக்கிறது என்பதை shape செய்கிறது.

இது ஏன் workflow authoring quality முக்கியம். Metadata ceremony அல்ல; self-healing system run ஆகும் fuel இது. Shallow step descriptions கொண்ட workflow என்பது count ஆகும்போது lead reason செய்ய முடியாத workflow.

## Live கவனிக்கிறது என்றால் Failures ஆவதற்கு முன்பே சிக்கல்களை கண்டறிவது

Lead real time இல் கவனிப்பதால், உண்மையில் உடைவதற்கு முன்பே soft signals இல் செயல்படலாம். Historically இரண்டு seconds இல் complete ஆகும் ஒரு படி இப்போது நாற்பது நேரம் எடுக்கிறது. ஒவ்வொரு prior run இலும் data திரும்பிய ஒரு படி empty result திரும்பி அனுப்புகிறது. முழு run வரலாற்றில் எடுக்கப்பட்டிராத ஒரு conditional branch எடுக்கப்படுகிறது. இவை hard errors அல்ல மற்றும் workflow running தொடர்கிறது, ஆனால் environment இல் ஏதோ மாறியிருக்கிறது என்ற signals. அடுத்த படி bad data consume செய்ய முயற்சிப்பதற்கு முன் அவற்றை கண்டறிவது சிறந்தது.

இந்த checks இன் sensitivity per workflow கட்டமைக்கக்கூடியது.

## இது இன்னும் உங்கள் Workflow

Lead agent மற்றும் அதன் team உங்கள் canonical workflow definition ஐ உங்கள் approval இல்லாமல் மாற்ற முடியாது. Lead ஒரு structural fix முன்மொழியும்போது, தற்போதைய run complete செய்ய fix apply செய்து மாற்றத்தை proposal ஆக submit செய்கிறது. நீங்கள் உங்கள் queue இல் பார்க்கிறீர்கள், reasoning பார்க்கிறீர்கள், approve அல்லது reject செய்கிறீர்கள். Reject செய்தால், அந்த rejection பதிவாகிறது மற்றும் அந்த workflow இல் செயல்படும் ஒவ்வொரு future lead க்கும் அதே விஷயத்தை மீண்டும் முன்மொழியாமல் தெரியும்.

Lead configuration எப்படியிருந்தாலும் மாற்ற முடியாத ஒரு விஷயம் உள்ளது: அதன் சொந்த mandate. Workflow definition இல் உள்ள self-healing policy, pause செய்யுமா, எவ்வளவு நேரம் retry செய்யுமா, approval தேவையா என்பது owner-authored policy. Lead task definitions patch செய்யலாம், API calls update செய்யலாம், parameters சரிசெய்யலாம், மற்றும் புதிய plugins author செய்யலாம். அதன் சொந்த proposals ஐ govern செய்யும் approval requirement ஐ மாற்ற முடியாது. அந்த எல்லை hard-coded.

## இது இன்று Ship ஆகிறது

Self-healing workflows இன்று Triggerfish workflow engine இல் optional feature ஆக ship ஆகின்றன. இது per workflow opt-in, workflow metadata block இல் கட்டமைக்கப்படுகிறது. இதை enable செய்யாவிட்டால், உங்கள் workflows எவ்வாறு run ஆகின்றன என்பதில் எதுவும் மாறாது.

இது ஒரு hard technical problem என்பதால் மட்டுமல்ல, ஆனால் enterprise automation ஐ தேவையானதை விட அதிக செலவுள்ளதாகவும் வலிகரமாகவும் செய்திருந்ததை நேரடியாக address செய்வதால் முக்கியம். Workflow maintenance team AI automation எடுக்கும் முதல் வேலையாக இருக்க வேண்டும். இது சரியான technology பயன்பாடு, மற்றும் அதுதான் Triggerfish கட்டமைத்தது.

அது எவ்வாறு செயல்படுகிறது என்பதை ஆராய விரும்பினால், முழு spec repository இல் உள்ளது. Try செய்ய விரும்பினால், workflow-builder skill உங்கள் முதல் self-healing workflow எழுத walk through செய்யும்.
