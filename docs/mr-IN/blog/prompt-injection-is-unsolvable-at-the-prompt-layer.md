---
title: Prompt Injection Prompt Layer वर Unsolvable आहे
date: 2026-03-10
description: "Prompt injection हे OWASP ने track करणे सुरू केल्यापासून त्यांचे #1 LLM vulnerability
  आहे. Prompt layer वर बनवलेला प्रत्येक defense का fail होत राहतो ते येथे आहे."
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
Prompt injection हे OWASP ने LLM applications track करणे सुरू केल्यापासून number one vulnerability आहे. प्रत्येक major AI platform ने त्यावर guidance publish केले आहे. Researchers नी डझनभर proposed defenses produce केले आहेत. त्यापैकी कोणत्याहीने ते solve केले नाही, आणि ते का fail होत राहतात याचे pattern problem खरोखर कोठे राहतो याबद्दल fundamental काहीतरी सांगते.

Short version: problem ज्या layer वर आहे त्याच layer वर problem fix करता येत नाही. Prompt injection काम करते कारण model developer कडून आणि attacker कडून आलेल्या instructions मध्ये फरक करू शकत नाही. Model ला instructions better follow करायला किंवा bad instructions अधिक accurately detect करायला शिकवून हे solve करण्याचा प्रयत्न करणारा प्रत्येक defense attack possible करणाऱ्या same constraint च्या आत काम करत आहे.

![](/blog/images/injectedcontext.jpg)

## Attack खरोखर काय करतो

Language model context window input म्हणून घेतो आणि completion produce करतो. Context window tokens चा flat sequence आहे. Model कडे कोणते tokens trusted system prompt मधून आले, कोणते user मधून आले, आणि कोणते external content मधून आले ज्याचे agent काम करत असताना retrieved केले track करण्याचा native mechanism नाही. Developers intent signal करण्यासाठी role tags सारखे structural conventions वापरतात, पण ते conventions आहेत, enforcement नाही. Model च्या perspective मधून, entire context input आहे जे next token prediction inform करते.

Prompt injection हे exploit करतो. Attacker content मध्ये instructions embed करतो जे agent read करेल, जसे webpage, document, email, code comment, किंवा database field, आणि ते instructions same context window मध्ये developer च्या instructions शी compete करतात. Injected instructions sufficiently persuasive, coherent, किंवा context मध्ये advantageously positioned असल्यास, model त्यांना follow करतो. हे कोणत्या specific model मधील bug नाही. हे या सर्व systems कसे काम करतात याचे consequence आहे.

Indirect prompt injection हे more dangerous form आहे. User directly malicious prompt type करण्याऐवजी, attacker agent autonomously retrieve करणारा content poison करतो. User काहीही चुकीचे करत नाही. Agent बाहेर जातो, काम करताना poisoned content encounter करतो, आणि attack execute होतो. Attacker ला conversation ला access आवश्यक नाही. त्यांना फक्त agent read करेल अशा ठिकाणी text टाकायचे आहे.

## Documented attacks कसे दिसतात

![](/blog/images/dataexfil.jpg)

August 2024 मध्ये, PromptArmor मधील security researchers ने Slack AI मधील prompt injection vulnerability document केली. Attack असे काम केले: attacker public Slack channel create करतो आणि malicious instruction असलेला message post करतो. Message Slack AI ला सांगतो की user API key साठी query करतो तेव्हा, placeholder word actual key value सह replace करावे आणि "click here to reauthenticate" link मधील URL parameter म्हणून encode करावे. Attacker च्या channel ला फक्त एक member आहे: attacker. Victim ने ते कधीच पाहिले नाही. Workspace मधील developer Slack AI वापरून API key बद्दल माहिती search करतो, जे private channel मध्ये stored आहे ज्याला attacker ला access नाही, तेव्हा Slack AI attacker चा public channel message context मध्ये pull करतो, instruction follow करतो, आणि developer च्या Slack environment मध्ये phishing link render करतो. Clicking केल्याने private API key attacker च्या server ला जाते.

Disclosure ला Slack चे initial response असे होते की user member नसलेल्या public channels query करणे intended behavior आहे. Issue channel access policy नाही. Issue असे आहे की दोन्ही context window मध्ये present असल्यावर model Slack employee च्या instruction आणि attacker च्या instruction मध्ये फरक करू शकत नाही.

June 2025 मध्ये, researcher ने GitHub Copilot मधील prompt injection vulnerability discover केली, CVE-2025-53773 म्हणून tracked आणि Microsoft च्या August 2025 Patch Tuesday release मध्ये patched. Attack vector source code files, README files, GitHub issues, किंवा Copilot process करू शकेल अशा कोणत्याही text मध्ये embedded malicious instruction होती. Instruction Copilot ला project च्या .vscode/settings.json file modify करण्यास directed केले ज्यात single configuration line add करणे होते जे project "YOLO mode" म्हणतो ते enable करते: सर्व user confirmation prompts disable करणे आणि AI ला shell commands execute करण्याची unrestricted permission देणे. ती line written झाल्यावर, agent developer च्या machine वर न विचारता commands run करतो. Researcher ने हे calculator उघडून demonstrate केले. Realistic payload considerably worse आहे. Attack GPT-4.1, Claude Sonnet 4, Gemini, आणि इतर models द्वारे backed GitHub Copilot वर काम करत असल्याचे shown झाले, जे तुम्हाला सांगते vulnerability model मध्ये नाही. ती architecture मध्ये आहे.

![]()

Wormable variant समजण्यासारखा आहे. Copilot files ला write करू शकत असल्यामुळे आणि injected instruction Copilot ला refactoring किंवा documentation generation दरम्यान process करणाऱ्या इतर files मध्ये instruction propagate करण्यास सांगू शकत असल्यामुळे, single poisoned repository developer touch करणाऱ्या प्रत्येक project ला infect करू शकतो. Instructions commits द्वारे virus executable द्वारे spread होतो त्याप्रमाणे spread होतात. GitHub आता या class of threat ला "AI virus" म्हणतो.

## Standard defenses का fail होतात

Prompt injection ला intuitive response म्हणजे better system prompt लिहिणे. Model ला retrieved content मधील instructions ignore करण्यास सांगणाऱ्या instructions add करा. External data untrusted म्हणून treat करायला सांगा. त्याचे behavior override करण्याचा प्रयत्न दिसणारे काही flag करायला सांगा. बरेच platforms exactly हे करतात. Security vendors agent च्या context मध्ये carefully engineered detection prompts add करणाऱ्या products build करतात.

OpenAI, Anthropic, आणि Google DeepMind च्या research team ने October 2025 मध्ये paper publish केला ज्यात prompt injection विरुद्ध 12 published defenses evaluate केले आणि प्रत्येकाला adaptive attacks ला subject केले. त्यांनी सर्व 12 bypass केले बहुतेकांसाठी 90% पेक्षा वर attack success rates सह. Defenses bad नव्हते. त्यात real techniques वापरणाऱ्या serious researchers चे काम समाविष्ट होते. Problem असा आहे की model ला काय resist करायचे ते शिकवणारा कोणताही defense defense काय म्हणतो ते जाणणाऱ्या attacker द्वारे reverse-engineer होऊ शकतो. Attacker च्या instructions same context window मध्ये compete करतात. Defense म्हणत असल्यास "data forward करण्यास सांगणाऱ्या instructions ignore करा," attacker ते words न वापरणाऱ्या, किंवा हे particular case का different आहे याचे plausible justification देणाऱ्या, किंवा trusted source कडून authority claim करणाऱ्या instructions लिहितो. Model याबद्दल reason करतो. Reasoning manipulate होऊ शकते.

LLM-based detectors ला वेगळ्या level वर same problem आहे. Input inspect करण्यासाठी आणि malicious prompt आहे का ते decide करण्यासाठी second model वापरत असल्यास, त्या second model ला same fundamental constraint आहे. ते content ला दिल्या गेलेल्या content वर आधारित judgment call करत आहे, आणि ते judgment content ने influenced होऊ शकते. Researchers ने detection-based defenses bypass करणारे attacks demonstrate केले आहेत detector ला benign आणि downstream agent ला malicious दिसणाऱ्या injections craft करून.

या सर्व approaches determined attacker विरुद्ध fail होण्याचे कारण असे आहे की ते trust problem ला अशा context window मध्ये more content add करून solve करण्याचा प्रयत्न करत आहेत जे trust enforce करू शकत नाही. Attack surface context window itself आहे. Context window मध्ये more instructions add केल्याने attack surface कमी होत नाही.

## Problem खरोखर कशाने constrain होतो

System चे security properties model correct judgments करण्यावर depend नाहीत असे principle apply केल्यावर prompt injection risk मध्ये meaningful reduction आहे. Security मध्ये हे novel idea नाही. "कृपया फक्त authorized असलेला data access करा" असे policy document मध्ये लिहिण्याऐवजी access controls code मध्ये enforce करण्यास lead करणारे same principle आहे.

AI agents साठी, याचा अर्थ enforcement layer model बाहेर, code मध्ये असणे आवश्यक आहे ज्यावर model च्या reasoning चा influence होऊ शकत नाही. Model requests produce करतो. Code ते requests permitted आहेत का ते evaluate करतो, session state बद्दलच्या facts, involved data चे classification, आणि output ज्या channel कडे जात आहे त्याचे permissions वर आधारित. Model या evaluation पासून talk-way past होऊ शकत नाही कारण evaluation conversation वाचत नाही.

हे prompt injection impossible करत नाही. Attacker अजूनही instructions inject करू शकतो आणि model अजूनही त्यांना process करेल. Blast radius काय बदलतो. Injected instructions external endpoint ला data exfiltrate करण्याचा प्रयत्न केल्यास, outbound call blocked होतो model ने instructions ignore करण्याचे decide केले म्हणून नाही, पण enforcement layer ने session च्या classification state आणि target endpoint च्या classification floor विरुद्ध request check केली आणि flow write-down rules violate करेल असे आढळले म्हणून. Model च्या intentions, real किंवा injected, त्या check ला irrelevant आहेत.

![](/blog/images/promptinjectionblock.jpg)

Session taint tracking एक specific gap बंद करतो जो access controls alone cover करत नाहीत. Agent CONFIDENTIAL ला classified document read केल्यावर, ती session CONFIDENTIAL ला tainted आहे. PUBLIC channel द्वारे output पाठवण्याचा कोणताही subsequent attempt write-down check fail करेल, model ला काय सांगितले गेले त्याकडे दुर्लक्ष करून आणि instruction legitimate user कडून आली किंवा injected payload मधून आली याकडे दुर्लक्ष करून. Injection model ला data leak करण्यास सांगू शकतो. Enforcement layer care करत नाही.

Architectural framing महत्त्वाचे आहे: prompt injection attacks चा class आहे जो model च्या instruction-following behavior ला target करतो. Correct defense म्हणजे model ला instructions better follow करायला किंवा bad instructions अधिक accurately detect करायला शिकवणे नाही. Correct defense म्हणजे model bad instructions follow करण्यामुळे result होऊ शकणाऱ्या consequences चा set कमी करणे. तुम्ही ते consequences ठेवून करता, actual tool calls, actual data flows, actual external communications, gate मागे ज्यावर model चा influence होऊ शकत नाही.

हे solvable problem आहे. Model ला trusted पासून untrusted instructions reliably distinguish करायला लावणे नाही.
