---
title: Prompt Injection Prompt Layer ನಲ್ಲಿ ಪರಿಹರಿಸಲಾಗದು
date: 2026-03-10
description: "Prompt injection OWASP ಅನ್ನು track ಮಾಡಲು ಪ್ರಾರಂಭಿಸಿದಾಗಿನಿಂದ LLM applications
  ಗೆ OWASP ನ #1 vulnerability ಆಗಿದೆ. Prompt layer ನಲ್ಲಿ ನಿರ್ಮಿಸಿದ ಪ್ರತಿ defense ಏಕೆ
  ವಿಫಲಗೊಳ್ಳುತ್ತಲೇ ಇದೆ ಎಂದು ಇಲ್ಲಿ ವಿವರಿಸಿದ್ದೇನೆ."
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
OWASP LLM applications ಗೆ vulnerability track ಮಾಡಲು ಪ್ರಾರಂಭಿಸಿದಾಗಿನಿಂದ prompt injection
ಅವರ number one vulnerability ಆಗಿದೆ. ಪ್ರತಿ ಪ್ರಮುಖ AI platform ಇದರ ಬಗ್ಗೆ guidance publish
ಮಾಡಿದೆ. Researchers ಡಜನ್‌ಗಟ್ಟಲೆ proposed defenses ತಯಾರಿಸಿದ್ದಾರೆ. ಅವ್ಯಾವವೂ ಇದನ್ನು
ಪರಿಹರಿಸಿಲ್ಲ, ಮತ್ತು ಅವು ವಿಫಲಗೊಳ್ಳುತ್ತಲೇ ಇರುವ ಕಾರಣಗಳ pattern ಸಮಸ್ಯೆ ನಿಜವಾಗಿ ಎಲ್ಲಿ ವಾಸಿಸುತ್ತದೆ
ಎಂಬುದರ ಬಗ್ಗೆ ಮೂಲಭೂತ ಏನನ್ನೋ ತೋರಿಸುತ್ತದೆ.

ಸಂಕ್ಷಿಪ್ತ version: ಸ್ವಯಂ ಸಮಸ್ಯೆ ಇರುವ layer ನಲ್ಲಿ ಸಮಸ್ಯೆ fix ಮಾಡಲಾಗದು. Prompt injection
ಕೆಲಸ ಮಾಡುವುದು ಏಕೆಂದರೆ model developer ನ ಸೂಚನೆಗಳನ್ನು ಮತ್ತು attacker ನ ಸೂಚನೆಗಳನ್ನು ಪ್ರತ್ಯೇಕಿಸಲಾಗದು.
Context window ಗೆ ಹೆಚ್ಚು ಸೂಚನೆಗಳನ್ನು ಸೇರಿಸಿ ಇದನ್ನು ಪರಿಹರಿಸಲು ಪ್ರಯತ್ನಿಸುವ ಪ್ರತಿ defense
attack ಸಾಧ್ಯವಾಗಿಸುವ ಅದೇ constraint ನಲ್ಲಿ ಕೆಲಸ ಮಾಡುತ್ತಿದೆ.

![](/blog/images/injectedcontext.jpg)

## Attack ನಿಜವಾಗಿ ಏನು ಮಾಡುತ್ತದೆ

Language model context window ಅನ್ನು input ಆಗಿ ತೆಗೆದುಕೊಂಡು completion ತಯಾರಿಸುತ್ತದೆ.
Context window tokens ನ flat sequence. Model ಯಾವ tokens trusted system prompt ನಿಂದ ಬಂದವು,
ಯಾವವು user ನಿಂದ, ಮತ್ತು ಯಾವವು agent ತನ್ನ ಕೆಲಸ ಮಾಡುತ್ತಿರುವಾಗ retrieve ಮಾಡಿದ external content
ನಿಂದ ಎಂದು track ಮಾಡಲು native mechanism ಹೊಂದಿಲ್ಲ. Developers intent signal ಮಾಡಲು role tags
ತರಹ structural conventions ಬಳಸುತ್ತಾರೆ, ಆದರೆ ಅವು conventions, enforcement ಅಲ್ಲ. Model ನ
ದೃಷ್ಟಿಕೋಣದಿಂದ, ಸಂಪೂರ್ಣ context next token prediction ಮಾಡಲು inform ಮಾಡುವ input.

Prompt injection ಇದನ್ನು exploit ಮಾಡುತ್ತದೆ. Attacker content ನಲ್ಲಿ ಸೂಚನೆಗಳನ್ನು embed ಮಾಡುತ್ತಾರೆ
-- webpage, document, email, code comment, ಅಥವಾ database field -- agent ಓದುತ್ತದೆ, ಮತ್ತು
ಆ ಸೂಚನೆಗಳು ಅದೇ context window ನಲ್ಲಿ developer ನ ಸೂಚನೆಗಳೊಂದಿಗೆ compete ಮಾಡುತ್ತವೆ. Injected
ಸೂಚನೆಗಳು ಸಾಕಷ್ಟು persuasive, coherent, ಅಥವಾ context ನಲ್ಲಿ ಅನುಕೂಲಕರ position ನಲ್ಲಿ ಇದ್ದರೆ,
model ಅವನ್ನು ಬದಲಿಗೆ follow ಮಾಡುತ್ತದೆ. ಇದು ಯಾವ specific model ನಲ್ಲಿ bug ಅಲ್ಲ. ಇದು ಈ ಎಲ್ಲ
systems ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತವೆ ಎಂಬ ಪರಿಣಾಮ.

Indirect prompt injection ಹೆಚ್ಚು ಅಪಾಯಕಾರಿ form. ಬಳಕೆದಾರ ನೇರವಾಗಿ malicious prompt type
ಮಾಡುವ ಬದಲು, attacker agent ಸ್ವಾಯತ್ತವಾಗಿ retrieve ಮಾಡುವ content ಅನ್ನು poison ಮಾಡುತ್ತಾರೆ.
ಬಳಕೆದಾರ ತಪ್ಪೇನೂ ಮಾಡುವುದಿಲ್ಲ. Agent ಹೊರಗೆ ಹೋಗಿ, ತನ್ನ ಕೆಲಸ ಮಾಡುವ ಕ್ರಮದಲ್ಲಿ poisoned
content ಎದುರಿಸಿ, attack execute ಆಗುತ್ತದೆ.

## ದಾಖಲಿತ Attacks ಹೇಗಿರುತ್ತವೆ

![](/blog/images/dataexfil.jpg)

August 2024 ರಲ್ಲಿ, PromptArmor ನ security researchers Slack AI ನಲ್ಲಿ prompt injection
vulnerability document ಮಾಡಿದರು. Attack ಹೀಗೆ ಕೆಲಸ ಮಾಡಿತು: attacker public Slack channel
ರಚಿಸಿ malicious instruction ಒಳಗೊಂಡ message post ಮಾಡುತ್ತಾರೆ. ಬಳಕೆದಾರ API key ಗಾಗಿ query
ಮಾಡಿದಾಗ, Slack AI placeholder word ಅನ್ನು actual key value ನಿಂದ replace ಮಾಡಿ "click here
to reauthenticate" link ನ URL parameter ಆಗಿ encode ಮಾಡಬೇಕು ಎಂದು message ಸ್ಲಾಕ್ ಎಐ ಗೆ
ಹೇಳುತ್ತದೆ. Developer private channel ನಲ್ಲಿ ಸಂಗ್ರಹಿಸಿದ API key ಗಾಗಿ Slack AI ಬಳಸಿ ಹುಡುಕಿದಾಗ,
Slack AI attacker ನ public channel message ಅನ್ನು context ಗೆ pull ಮಾಡಿ, ಸೂಚನೆ follow ಮಾಡಿ,
developer ನ Slack environment ನಲ್ಲಿ phishing link render ಮಾಡುತ್ತದೆ. Click ಮಾಡಿದರೆ private
API key attacker ನ server ಗೆ ಕಳುಹಿಸಲ್ಪಡುತ್ತದೆ.

Disclosure ಗೆ Slack ನ ಆರಂಭಿಕ response ಏನೆಂದರೆ ಬಳಕೆದಾರ member ಆಗಿಲ್ಲದ public channels query
ಮಾಡುವುದು intended behavior ಎಂದು. ಸಮಸ್ಯೆ channel access policy ಅಲ್ಲ. ಸಮಸ್ಯೆ model ಎರಡೂ
context window ನಲ್ಲಿ ಇದ್ದಾಗ Slack employee ನ ಸೂಚನೆ ಮತ್ತು attacker ನ ಸೂಚನೆ ನಡುವೆ ವ್ಯತ್ಯಾಸ
ಮಾಡಲಾಗದು.

June 2025 ರಲ್ಲಿ, researcher GitHub Copilot ನಲ್ಲಿ prompt injection vulnerability ಕಂಡು ಹಿಡಿದರು,
CVE-2025-53773 ಆಗಿ tracked ಮತ್ತು Microsoft ನ August 2025 Patch Tuesday release ನಲ್ಲಿ patched.
Attack vector Copilot process ಮಾಡಬಹುದಾದ source code files, README files, GitHub issues,
ಅಥವಾ ಯಾವ ಇತರ text ನಲ್ಲಿ embedded malicious instruction. ಒಮ್ಮೆ agent shell commands
unrestricted permission ನೊಂದಿಗೆ execute ಮಾಡಿದರೆ, attack ಯಶಸ್ವಿ. Attack GPT-4.1, Claude
Sonnet 4, Gemini ಮತ್ತು ಇತರ models ನಿಂದ backed GitHub Copilot ಅಡ್ಡಲಾಗಿ ಕೆಲಸ ಮಾಡಿತು,
ಅಂದರೆ vulnerability model ನಲ್ಲಿ ಅಲ್ಲ. ಇದು architecture ನಲ್ಲಿ.

## Standard Defenses ಏಕೆ ವಿಫಲವಾಗುತ್ತವೆ

Prompt injection ಗೆ intuitive response ಉತ್ತಮ system prompt ಬರೆಯುವುದು. Retrieved content
ನಲ್ಲಿ ಸೂಚನೆಗಳನ್ನು ignore ಮಾಡಲು model ಗೆ ಹೇಳುವ ಸೂಚನೆಗಳನ್ನು ಸೇರಿಸಿ. ಬಾಹ್ಯ ಡೇಟಾ ಅನ್ನು
untrusted ಎಂದು ಪರಿಗಣಿಸಲು ಹೇಳಿ. ಅದರ ನಡವಳಿಕೆ override ಮಾಡಲು ಪ್ರಯತ್ನ ತರಹ ಕಾಣುವ ಯಾವುದನ್ನಾದರೂ
flag ಮಾಡಲು ಹೇಳಿ.

OpenAI, Anthropic, ಮತ್ತು Google DeepMind ನ research team October 2025 ರಲ್ಲಿ prompt injection
ವಿರುದ್ಧ 12 published defenses evaluate ಮಾಡಿದ paper publish ಮಾಡಿ ಪ್ರತಿಯೊಂದನ್ನು adaptive
attacks ಗೆ expose ಮಾಡಿದರು. ಅವರು ಹೆಚ್ಚಿನ defenses ಗಾಗಿ 90% ಮೇಲಿನ attack success rates ನೊಂದಿಗೆ
ಎಲ್ಲ 12 ಅನ್ನು bypass ಮಾಡಿದರು. Defenses ಕೆಟ್ಟದ್ದಾಗಿರಲಿಲ್ಲ. ಸಮಸ್ಯೆ ಏನೆಂದರೆ model ಏನನ್ನು
ತಡೆಯಬೇಕು ಎಂದು ಕಲಿಸುವ ಯಾವ defense ಅನ್ನೂ defense ಏನು ಹೇಳುತ್ತದೆ ಎಂದು ತಿಳಿದ attacker
reverse-engineer ಮಾಡಬಹುದು.

ಎಲ್ಲ ಈ approaches ಒಂದು ದೃಢಪ್ರತಿಜ್ಞ attacker ವಿರುದ್ಧ ವಿಫಲಗೊಳ್ಳುವ ಕಾರಣ ಅವು trust ಜಾರಿಗೊಳಿಸಲಾಗದ
context window ಗೆ ಹೆಚ್ಚು content ಸೇರಿಸಿ trust ಸಮಸ್ಯೆ ಪರಿಹರಿಸಲು ಪ್ರಯತ್ನಿಸುತ್ತವೆ. Attack
surface context window ಸ್ವತಃ. Context window ಗೆ ಹೆಚ್ಚು ಸೂಚನೆಗಳನ್ನು ಸೇರಿಸುವುದು attack
surface ಕಡಿಮೆ ಮಾಡುವುದಿಲ್ಲ.

## ಸಮಸ್ಯೆಯನ್ನು ನಿಜವಾಗಿ ಸೀಮಿತಗೊಳಿಸುವುದು

System ನ ಭದ್ರತಾ properties model ಸರಿಯಾದ ನಿರ್ಣಯಗಳನ್ನು ಮಾಡುವ ಮೇಲೆ ಅವಲಂಬಿಸಬಾರದು ಎಂಬ
principle apply ಮಾಡಿದಾಗ prompt injection risk ನಲ್ಲಿ ಅರ್ಥಪೂರ್ಣ reduction ಇದೆ. ಇದು security
ನಲ್ಲಿ novel idea ಅಲ್ಲ. Policy document ನಲ್ಲಿ "authorize ಆದ ಡೇಟಾ ಮಾತ್ರ access ಮಾಡಿ" ಬರೆಯುವ
ಬದಲು code ನಲ್ಲಿ access controls ಜಾರಿಗೊಳಿಸಲು ಕಾರಣವಾಗುವ ಅದೇ principle.

AI agents ಗಾಗಿ, ಇದರರ್ಥ enforcement layer model ಹೊರಗೆ, model ನ reasoning ಪ್ರಭಾವಿಸಲಾಗದ
code ನಲ್ಲಿ ಇರಬೇಕು. Model requests ತಯಾರಿಸುತ್ತದೆ. Code ಆ requests permitted ಆಗಿವೆಯೇ ಎಂದು
evaluate ಮಾಡುತ್ತದೆ, session state ಬಗ್ಗೆ facts, ತೊಡಗಿರುವ ಡೇಟಾದ classification, ಮತ್ತು output
ಹೋಗುತ್ತಿರುವ channel ನ permissions ಆಧಾರದ ಮೇಲೆ. Model ಈ evaluation ಅನ್ನು reason out ಮಾಡಲಾಗದು
ಏಕೆಂದರೆ evaluation ಸಂಭಾಷಣೆ ಓದುವುದಿಲ್ಲ.

ಇದು prompt injection ಅಸಾಧ್ಯ ಮಾಡುವುದಿಲ್ಲ. Attacker ಇನ್ನೂ ಸೂಚನೆಗಳನ್ನು inject ಮಾಡಬಹುದು
ಮತ್ತು model ಅವನ್ನು process ಮಾಡುತ್ತದೆ. ಬದಲಾಗುವುದು blast radius. Injected ಸೂಚನೆಗಳು
external endpoint ಗೆ ಡೇಟಾ exfiltrate ಮಾಡಲು ಪ್ರಯತ್ನಿಸಿದರೆ, outbound call block ಮಾಡಲ್ಪಡುತ್ತದೆ --
model ಸೂಚನೆಗಳನ್ನು ignore ಮಾಡಲು ನಿರ್ಧರಿಸಿದ ಕಾರಣ ಅಲ್ಲ, ಆದರೆ enforcement layer session ನ
classification state ಮತ್ತು target endpoint ನ classification floor ವಿರುದ್ಧ request check
ಮಾಡಿ flow write-down rules violate ಮಾಡುತ್ತದೆ ಎಂದು ಕಂಡ ಕಾರಣ.

![](/blog/images/promptinjectionblock.jpg)

Session taint tracking access controls ಮಾತ್ರ cover ಮಾಡದ specific gap ಮುಚ್ಚುತ್ತದೆ. Agent
CONFIDENTIAL ನಲ್ಲಿ classified document ಓದಿದಾಗ, ಆ session ಈಗ CONFIDENTIAL ಗೆ tainted. PUBLIC
channel ಮೂಲಕ output ಕಳುಹಿಸಲು ನಂತರದ ಯಾವ ಪ್ರಯತ್ನ write-down check fail ಮಾಡುತ್ತದೆ, model
ಏನು ಮಾಡಲು ಹೇಳಲ್ಪಟ್ಟಿದ್ದರೂ ಸರಿ ಮತ್ತು ಸೂಚನೆ legitimate user ನಿಂದ ಬಂದಿರಲಿ ಅಥವಾ injected
payload ನಿಂದ ಬಂದಿರಲಿ ಸರಿ.

Architectural framing ಮುಖ್ಯ: prompt injection model ನ instruction-following behavior target
ಮಾಡುವ attack ವರ್ಗ. ಸರಿಯಾದ defense model ಸೂಚನೆಗಳನ್ನು ಉತ್ತಮವಾಗಿ follow ಮಾಡಲು ಅಥವಾ ಕೆಟ್ಟ
ಸೂಚನೆಗಳನ್ನು ನಿಖರವಾಗಿ detect ಮಾಡಲು ಕಲಿಸುವುದಲ್ಲ. ಸರಿಯಾದ defense model ಕೆಟ್ಟ ಸೂಚನೆಗಳನ್ನು
follow ಮಾಡಿದ ಪರಿಣಾಮಗಳ set ಕಡಿಮೆ ಮಾಡುವುದು. ಇದನ್ನು ನೀವು ಪರಿಣಾಮಗಳನ್ನು -- ನಿಜ tool calls,
ನಿಜ data flows, ನಿಜ external communications -- model ಪ್ರಭಾವಿಸಲಾಗದ gate ಹಿಂದೆ ಇಟ್ಟು ಮಾಡುತ್ತೀರಿ.

ಅದು solvable problem. Model ವಿಶ್ವಾಸಾರ್ಹವಾಗಿ trusted ಮತ್ತು untrusted ಸೂಚನೆಗಳ ನಡುವೆ
ವ್ಯತ್ಯಾಸ ಮಾಡುವಂತೆ ಮಾಡುವುದು ಅಲ್ಲ.
