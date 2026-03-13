---
title: Prompt Injection को Prompt Layer पर हल नहीं किया जा सकता
date: 2026-03-10
description: "Prompt injection OWASP की #1 LLM vulnerability रही है जब से उन्होंने इसे
  track करना शुरू किया। यहाँ बताया गया है कि prompt layer पर बनाई गई हर defense बार-बार
  क्यों विफल होती रहती है।"
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
Prompt injection OWASP की LLM applications के लिए नंबर एक vulnerability रही है जब से उन्होंने इसे track करना शुरू किया। हर प्रमुख AI platform ने इस पर guidance प्रकाशित किया है। शोधकर्ताओं ने दर्जनों proposed defenses तैयार किए हैं। किसी ने भी इसे हल नहीं किया है, और वे बार-बार क्यों विफल होती हैं इसका pattern कुछ बुनियादी बात की ओर इशारा करता है — कि समस्या वास्तव में कहाँ है।

संक्षेप में: आप किसी समस्या को उसी layer पर ठीक नहीं कर सकते जो खुद समस्या है। Prompt injection इसलिए काम करती है क्योंकि model developer के instructions और attacker के instructions में अंतर नहीं कर सकता। हर defense जो model को और अधिक instructions देकर इसे हल करने की कोशिश करती है, वह उसी constraint के अंदर काम कर रही है जो पहले से इस attack को संभव बनाती है।

![](/blog/images/injectedcontext.jpg)

## Attack वास्तव में क्या करता है

एक language model input के रूप में एक context window लेता है और एक completion produce करता है। Context window tokens का एक flat sequence है। Model के पास कोई native mechanism नहीं है जिससे वह track कर सके कि कौन से tokens एक trusted system prompt से आए, कौन से user से आए, और कौन से बाहरी content से आए जो agent ने अपना काम करते हुए retrieve किया। Developers intent signal करने के लिए role tags जैसी structural conventions का उपयोग करते हैं, लेकिन वे conventions हैं, enforcement नहीं। Model के दृष्टिकोण से, पूरा context एक input है जो next token prediction को inform करता है।

Prompt injection इसी का शोषण करती है। एक attacker ऐसे content में instructions embed करता है जो agent पढ़ेगा — जैसे कोई webpage, document, email, code comment, या database field — और वे instructions developer के instructions के साथ उसी context window में compete करते हैं। अगर injected instructions काफी persuasive हैं, काफी coherent हैं, या context में अनुकूल position पर हैं, तो model उन्हीं को follow करता है। यह किसी specific model में bug नहीं है। यह इन सभी systems के काम करने के तरीके का एक परिणाम है।

Indirect prompt injection इसका ज़्यादा खतरनाक रूप है। इसमें user सीधे कोई malicious prompt type नहीं करता, बल्कि attacker उस content को poison करता है जो agent autonomously retrieve करता है। User कुछ भी गलत नहीं करता। Agent बाहर जाता है, अपना काम करते हुए poisoned content का सामना करता है, और attack execute हो जाता है। Attacker को conversation तक access की ज़रूरत नहीं। उन्हें बस अपना text कहीं ऐसी जगह रखना होता है जहाँ agent उसे पढ़ेगा।

## Documented attacks कैसे दिखते हैं

![](/blog/images/dataexfil.jpg)

अगस्त 2024 में, PromptArmor के security researchers ने Slack AI में एक prompt injection vulnerability document की। Attack इस तरह काम करता था: एक attacker एक public Slack channel बनाता है और उसमें एक malicious instruction वाला message post करता है। वह message Slack AI को बताता है कि जब कोई user API key के बारे में query करे, तो वह एक placeholder word को actual key value से replace करे और उसे "reauthenticate करने के लिए यहाँ click करें" link में URL parameter के रूप में encode करे। Attacker के channel में केवल एक member है: खुद attacker। Victim ने कभी वह channel देखा तक नहीं। जब workspace में कहीं और कोई developer Slack AI का उपयोग करके अपनी API key के बारे में जानकारी खोजता है, जो एक private channel में stored है जहाँ attacker की access नहीं है, तो Slack AI attacker के public channel message को context में खींच लेता है, उस instruction को follow करता है, और developer के Slack environment में phishing link render करता है। उस पर click करने से private API key attacker के server पर भेज दी जाती है।

Slack की disclosure पर शुरुआती प्रतिक्रिया यह थी कि user जिन public channels का member नहीं है उन्हें query करना intended behavior है। मुद्दा channel access policy नहीं है। मुद्दा यह है कि model एक Slack employee के instruction और एक attacker के instruction में अंतर नहीं कर सकता जब दोनों context window में मौजूद हों।

जून 2025 में, एक researcher ने GitHub Copilot में prompt injection vulnerability खोजी, जिसे CVE-2025-53773 के रूप में track किया गया और Microsoft के अगस्त 2025 Patch Tuesday release में patch किया गया। Attack vector source code files, README files, GitHub issues, या किसी भी अन्य text में embedded एक malicious instruction थी जो Copilot process कर सकता था। वह instruction Copilot को project की .vscode/settings.json file को modify करने के लिए निर्देशित करती थी ताकि एक single configuration line जोड़ी जा सके जो project के "YOLO mode" को enable करती है: सभी user confirmation prompts को disable करना और AI को बिना किसी प्रतिबंध के shell commands execute करने की permission देना। एक बार वह line लिखी जाती, agent बिना पूछे developer की machine पर commands चलाता। Researcher ने एक calculator खोलकर इसका demonstration किया। यथार्थवादी payload काफ़ी बदतर है। यह attack GitHub Copilot पर GPT-4.1, Claude Sonnet 4, Gemini, और अन्य models के साथ काम करता दिखाया गया, जो बताता है कि vulnerability model में नहीं है। यह architecture में है।

![]()

Wormable variant को समझना ज़रूरी है। क्योंकि Copilot files में लिख सकता है और injected instruction Copilot को बता सकती है कि refactoring या documentation generation के दौरान जो अन्य files वह process करता है उनमें भी इस instruction को propagate करे, एक single poisoned repository उन सभी projects को infect कर सकता है जिन्हें developer touch करता है। Instructions commits के ज़रिए उसी तरह फैलती हैं जैसे एक virus executable के ज़रिए फैलता है। GitHub अब इस class of threat को "AI virus" कहता है।

## Standard defenses क्यों विफल होती हैं

Prompt injection पर सहज प्रतिक्रिया है कि एक बेहतर system prompt लिखा जाए। ऐसे instructions जोड़ें जो model को बताएँ कि retrieved content में आए instructions को ignore करे। उसे बताएँ कि external data को untrusted माने। उसे बताएँ कि जो कुछ भी उसके behavior को override करने का प्रयास लगता है उसे flag करे। बहुत सी platforms ठीक यही करती हैं। Security vendors ऐसे products बेचते हैं जो agent के context में carefully engineered detection prompts जोड़ने पर आधारित हैं।

OpenAI, Anthropic, और Google DeepMind की एक research team ने अक्टूबर 2025 में एक paper प्रकाशित किया जिसमें prompt injection के खिलाफ 12 published defenses का मूल्यांकन किया गया और प्रत्येक को adaptive attacks के अधीन किया गया। उन्होंने सभी 12 को bypass किया, अधिकांश के लिए 90% से ऊपर attack success rates के साथ। Defenses खराब नहीं थीं। इनमें गंभीर researchers का काम शामिल था जो real techniques का उपयोग कर रहे थे। समस्या यह है कि कोई भी defense जो model को सिखाती है कि किसका विरोध करना है, उसे reverse-engineer किया जा सकता है उस attacker द्वारा जो जानता है कि defense क्या कहती है। Attacker के instructions उसी context window में compete करते हैं। अगर defense कहती है "उन instructions को ignore करो जो तुम्हें data forward करने को कहती हैं," तो attacker ऐसे instructions लिखता है जो उन शब्दों का उपयोग नहीं करते, या जो एक plausible justification देते हैं कि यह particular case अलग क्यों है, या जो किसी trusted source से authority claim करते हैं। Model इस पर reason करता है। Reasoning को manipulate किया जा सकता है।

LLM-based detectors में एक अलग level पर वही समस्या है। अगर आप input को inspect करने और यह तय करने के लिए कि उसमें malicious prompt है या नहीं, एक दूसरे model का उपयोग करते हैं, तो उस दूसरे model में भी वही fundamental constraint है। वह उसे दिए गए content के आधार पर एक judgment call कर रहा है, और उस judgment को content प्रभावित कर सकता है। Researchers ने ऐसे attacks demonstrate किए हैं जो detection-based defenses को सफलतापूर्वक bypass करते हैं — ऐसे injections बनाकर जो detector को benign लगते हैं और downstream agent के लिए malicious।

इन सभी approaches के एक determined attacker के खिलाफ विफल होने का कारण यह है कि वे एक trust problem को ऐसे context window में और content जोड़कर हल करने की कोशिश कर रही हैं जो trust enforce नहीं कर सकता। Attack surface स्वयं context window है। Context window में और instructions जोड़ने से attack surface कम नहीं होता।

## वास्तव में समस्या को क्या constrain करता है

Prompt injection risk में सार्थक कमी तब आती है जब आप यह principle लागू करते हैं कि एक system की security properties model के सही judgments लेने पर निर्भर नहीं होनी चाहिए। यह security में कोई नई बात नहीं है। यह वही principle है जो आपको access controls को code में enforce करने के लिए प्रेरित करता है, बजाय इसके कि policy document में लिखें "कृपया केवल उसी data को access करें जिसके लिए आप authorized हैं।"

AI agents के लिए, इसका मतलब है कि enforcement layer को model के बाहर बैठना होगा, ऐसे code में जिसे model की reasoning प्रभावित नहीं कर सकती। Model requests produce करता है। Code evaluate करता है कि वे requests permitted हैं या नहीं, session state, involved data की classification, और उस channel की permissions के आधार पर जहाँ output जा रहा है। Model इस evaluation को बातों से पार नहीं कर सकता क्योंकि evaluation conversation पढ़ता ही नहीं।

इससे prompt injection असंभव नहीं हो जाती। Attacker अभी भी instructions inject कर सकता है और model अभी भी उन्हें process करेगा। जो बदलता है वह blast radius है। अगर injected instructions किसी external endpoint पर data exfiltrate करने की कोशिश करते हैं, तो outbound call इसलिए block होता है कि model ने instructions ignore करने का फ़ैसला किया — बल्कि इसलिए कि enforcement layer ने request को session की classification state और target endpoint की classification floor के विरुद्ध check किया और पाया कि यह flow write-down rules का उल्लंघन करेगा। Model के intentions, चाहे असली हों या injected, उस check के लिए irrelevant हैं।

![](/blog/images/promptinjectionblock.jpg)

Session taint tracking एक specific gap को बंद करता है जो अकेले access controls से cover नहीं होता। जब एक agent CONFIDENTIAL पर classified कोई document पढ़ता है, तो वह session अब CONFIDENTIAL पर tainted हो जाता है। उसके बाद PUBLIC channel के ज़रिए output भेजने का कोई भी प्रयास write-down check में fail होता है, चाहे model को कुछ भी करने को कहा गया हो और चाहे instruction किसी legitimate user से आई हो या किसी injected payload से। Injection model को data leak करने के लिए कह सकता है। Enforcement layer को कोई फ़र्क नहीं पड़ता।

Architectural framing मायने रखती है: prompt injection एक ऐसी class of attack है जो model के instruction-following behavior को target करती है। सही defense model को instructions बेहतर follow करना सिखाना या खराब instructions को ज़्यादा accurately detect करना नहीं है। सही defense उन consequences के set को कम करना है जो model द्वारा खराब instructions follow करने से हो सकते हैं। आप यह actual tool calls, actual data flows, actual external communications को एक ऐसे gate के पीछे रखकर करते हैं जिसे model प्रभावित नहीं कर सकता।

यह एक हल करने योग्य समस्या है। Model को trusted और untrusted instructions में विश्वसनीय रूप से अंतर करा पाना — वह नहीं है।
