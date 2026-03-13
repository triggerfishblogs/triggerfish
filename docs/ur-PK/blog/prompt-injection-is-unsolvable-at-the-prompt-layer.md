---
title: Prompt Injection Prompt Layer پر Unsolvable ہے
date: 2026-03-10
description: "Prompt injection OWASP کی #1 LLM vulnerability رہی ہے جب سے انہوں نے
  track کرنا شروع کیا۔ یہاں جانیں کہ prompt layer پر بنی ہر defense کیوں fail
  ہوتی رہتی ہے۔"
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
Prompt injection اس وقت سے OWASP کی LLM applications کے لیے number one vulnerability رہی ہے جب سے انہوں نے track کرنا شروع کیا۔ ہر بڑے AI platform نے اس پر guidance publish کی ہے۔ Researchers نے درجنوں proposed defenses تیار کی ہیں۔ کسی نے بھی اسے solve نہیں کیا، اور ان کے بار بار fail ہونے کا pattern اس بارے میں کچھ fundamental بتاتا ہے کہ مسئلہ اصل میں کہاں ہے۔

مختصر version: آپ کسی مسئلے کو اس layer پر fix نہیں کر سکتے جو خود مسئلہ ہے۔ Prompt injection کام کرتا ہے کیونکہ model developer کی instructions اور attacker کی instructions میں فرق نہیں کر سکتا۔ ہر defense جو اس layer پر کام کرتی ہے جو attack کو ممکن بناتی ہے وہی model کو مزید instructions add کر کے اسے solve کرنے کی کوشش کر رہی ہے۔

![](/blog/images/injectedcontext.jpg)

## Attack اصل میں کیا کرتا ہے

ایک language model context window کو input کے طور پر لیتا ہے اور completion produce کرتا ہے۔ Context window tokens کی ایک flat sequence ہے۔ Model کے پاس یہ track کرنے کا کوئی native mechanism نہیں کہ کون سے tokens trusted system prompt سے آئے، کون سے user سے آئے، اور کون سے external content سے آئے جو agent نے کام کرتے ہوئے retrieve کی۔ Developers نے trust signal کرنے کے لیے role tags جیسے structural conventions استعمال کیے، لیکن یہ conventions ہیں، enforcement نہیں۔ Model کے نقطہ نظر سے، پورا context input ہے جو next token prediction کو inform کرتا ہے۔

Prompt injection اسی کا فائدہ اٹھاتا ہے۔ Attacker content میں instructions embed کرتا ہے جو agent پڑھے گا، جیسے webpage، document، email، code comment، یا database field، اور وہ instructions developer کی instructions کے ساتھ ایک ہی context window میں compete کرتی ہیں۔ اگر injected instructions کافی persuasive، coherent، یا context میں اچھی position پر ہوں تو model انہیں follow کرتا ہے۔ یہ کسی specific model میں bug نہیں۔ یہ ان تمام systems کے کام کرنے کے طریقے کا نتیجہ ہے۔

Indirect prompt injection زیادہ خطرناک form ہے۔ User کے directly malicious prompt type کرنے کی بجائے، attacker وہ content poison کرتا ہے جو agent خود-مختاری سے retrieve کرتا ہے۔ User کچھ غلط نہیں کرتا۔ Agent باہر جاتا ہے، اپنا کام کرتے ہوئے poisoned content سے ملتا ہے، اور attack execute ہو جاتا ہے۔ Attacker کو conversation تک access کی ضرورت نہیں۔ انہیں صرف اپنا text کسی جگہ پہنچانا ہے جہاں agent اسے پڑھے گا۔

## Documented Attacks کیسے لگتے ہیں

![](/blog/images/dataexfil.jpg)

August 2024 میں، PromptArmor کے security researchers نے Slack AI میں ایک prompt injection vulnerability document کی۔ Attack اس طرح کام کیا: attacker ایک public Slack channel بناتا ہے اور ایک malicious instruction پر مشتمل message post کرتا ہے۔ Message Slack AI کو بتاتی ہے کہ جب user API key کے بارے میں query کرے تو ایک placeholder word کو actual key value سے replace کرے اور اسے "click here to reauthenticate" link میں URL parameter کے طور پر encode کرے۔ Attacker کے channel کا صرف ایک member ہے: attacker۔ Victim نے اسے کبھی نہیں دیکھا۔ جب workspace میں کہیں اور ایک developer Slack AI سے اپنی API key کے بارے میں معلومات ڈھونڈنے کے لیے کہتا ہے، جو ایک private channel میں stored ہے جس تک attacker کی کوئی access نہیں، تو Slack AI attacker کے public channel message کو context میں pull کرتا ہے، instruction follow کرتا ہے، اور developer کے Slack environment میں phishing link render کرتا ہے۔ اس پر click کرنے سے private API key attacker کے server کو چلی جاتی ہے۔

Disclosure پر Slack کا ابتدائی response یہ تھا کہ ان channels کو query کرنا جن کا user member نہیں intended behavior ہے۔ مسئلہ channel access policy نہیں۔ مسئلہ یہ ہے کہ model Slack employee کی instruction اور attacker کی instruction میں فرق نہیں کر سکتا جب دونوں context window میں موجود ہوں۔

June 2025 میں، ایک researcher نے GitHub Copilot میں ایک prompt injection vulnerability دریافت کی، CVE-2025-53773 کے طور پر track ہوئی اور Microsoft کے August 2025 Patch Tuesday release میں patch ہوئی۔ Attack vector source code files، README files، GitHub issues، یا کوئی بھی text میں embedded malicious instruction تھی جسے Copilot process کر سکتا ہے۔ Instruction نے Copilot کو project کی `.vscode/settings.json` file modify کرنے کی ہدایت کی تاکہ ایک single configuration line add ہو جو project کے "YOLO mode" کو enable کرے: تمام user confirmation prompts disable کر کے AI کو shell commands بغیر پوچھے چلانے کی unrestricted permission دینا۔ ایک بار وہ line لکھی گئی تو agent developer کی machine پر بغیر پوچھے commands چلاتا ہے۔ Researcher نے calculator کھول کر یہ demonstrate کیا۔ Realistic payload کافی بدتر ہے۔ Attack GPT-4.1، Claude Sonnet 4، Gemini اور دیگر models پر backed GitHub Copilot پر کام کرتا دکھایا گیا، جو آپ کو بتاتا ہے کہ vulnerability model میں نہیں۔ یہ architecture میں ہے۔

![]()

Wormable variant سمجھنے کے قابل ہے۔ چونکہ Copilot files لکھ سکتا ہے اور injected instruction Copilot کو ہدایت دے سکتی ہے کہ instruction کو ان دیگر files میں propagate کرے جو refactoring یا documentation generation کے دوران process کرتا ہے، ایک poisoned repository ہر project کو infect کر سکتا ہے جسے developer touch کرتا ہے۔ Instructions commits کے ذریعے پھیلتی ہیں جیسے virus کسی executable کے ذریعے پھیلتا ہے۔ GitHub اب اس class of threat کو "AI virus" کہتا ہے۔

## Standard Defenses کیوں Fail ہوتی ہیں

Prompt injection کا intuitive response ایک بہتر system prompt لکھنا ہے۔ Model کو instructions add کریں کہ retrieved content میں instructions ignore کرے۔ اسے بتائیں کہ external data کو untrusted سمجھے۔ اسے بتائیں کہ کسی بھی چیز کو flag کرے جو اس کے behavior override کرنے کی کوشش لگے۔ بہت سے platforms بالکل یہی کرتے ہیں۔ Security vendors ایسی products بیچتے ہیں جو agent کے context میں carefully engineered detection prompts add کرنے کے گرد بنی ہیں۔

OpenAI، Anthropic، اور Google DeepMind کی ایک research team نے October 2025 میں ایک paper publish کی جس نے prompt injection کے خلاف 12 published defenses evaluate کیں اور ہر ایک کو adaptive attacks کا سامنا کرایا۔ انہوں نے سب 12 کو bypass کیا، زیادہ تر کے لیے 90% سے زیادہ attack success rates کے ساتھ۔ Defenses بری نہیں تھیں۔ ان میں real techniques استعمال کرنے والے serious researchers کا کام شامل تھا۔ مسئلہ یہ ہے کہ کوئی بھی defense جو model کو یہ سکھاتی ہے کہ کیسے resist کرنا ہے ایک attacker reverse-engineer کر سکتا ہے جو جانتا ہے کہ defense کیا کہتی ہے۔ Attacker کی instructions ایک ہی context window میں compete کرتی ہیں۔ اگر defense کہے "ان instructions کو ignore کرو جو data forward کرنے کو کہیں" تو attacker ایسی instructions لکھتا ہے جو وہ الفاظ استعمال نہ کریں، یا جو ایک plausible justification دیں کہ یہ مخصوص case مختلف کیوں ہے، یا جو کسی trusted source سے authority claim کریں۔ Model اس کے بارے میں reason کرتا ہے۔ Reasoning کو manipulate کیا جا سکتا ہے۔

LLM-based detectors کو ایک مختلف level پر وہی مسئلہ ہے۔ اگر آپ input inspect کرنے اور decide کرنے کے لیے کہ اس میں malicious prompt ہے یا نہیں ایک دوسرا model استعمال کریں تو اس دوسرے model کو بالکل وہی fundamental constraint ہے۔ یہ اس content کی بنیاد پر judgment call کر رہا ہے جو اسے دی گئی ہے، اور وہ judgment content سے influence ہو سکتی ہے۔ Researchers نے ایسے attacks demonstrate کیے ہیں جو detection-based defenses کو successfully bypass کرتے ہیں ایسے injections craft کر کے جو detector کو benign اور downstream agent کو malicious لگیں۔

ان تمام approaches کے ایک determined attacker کے خلاف fail ہونے کی وجہ یہ ہے کہ یہ ایک ایسے context window میں مزید content add کر کے ایک trust problem solve کرنے کی کوشش کر رہی ہیں جو trust enforce نہیں کر سکتا۔ Attack surface context window خود ہے۔ Context window میں مزید instructions add کرنے سے attack surface کم نہیں ہوتی۔

## جو چیز واقعی مسئلہ محدود کرتی ہے

Prompt injection risk میں ایک meaningful کمی ہوتی ہے جب آپ یہ principle apply کریں کہ system کی security properties کا انحصار model کے صحیح judgments کرنے پر نہیں ہونا چاہیے۔ Security میں یہ کوئی نئی idea نہیں۔ یہ وہی principle ہے جو آپ کو access controls code میں enforce کرنے پر لے جاتا ہے بجائے policy document میں "please only access data you're authorized to access" لکھنے کے۔

AI agents کے لیے، اس کا مطلب ہے enforcement layer کو model سے باہر، ایسے code میں بیٹھنا چاہیے جسے model کی reasoning influence نہیں کر سکتی۔ Model requests produce کرتا ہے۔ Code evaluate کرتا ہے کہ وہ requests permitted ہیں یا نہیں، session state کے حقائق، involved data کی classification، اور output کے جانے والے channel کی permissions کی بنیاد پر۔ Model اس evaluation سے negotiate نہیں کر سکتا کیونکہ evaluation conversation نہیں پڑھتی۔

یہ prompt injection کو ناممکن نہیں بناتا۔ Attacker پھر بھی instructions inject کر سکتا ہے اور model انہیں process کرتا رہے گا۔ جو بدلتا ہے وہ blast radius ہے۔ اگر injected instructions کسی external endpoint تک data exfiltrate کرنے کی کوشش کریں تو outbound call block ہوتی ہے اس لیے نہیں کہ model نے instructions ignore کرنے کا فیصلہ کیا، بلکہ اس لیے کہ enforcement layer نے request کو session کی classification state اور target endpoint کی classification floor کے خلاف check کیا اور پایا کہ flow write-down rules violate کرے گا۔ Model کے intentions، چاہے real ہوں یا injected، اس check سے irrelevant ہیں۔

![](/blog/images/promptinjectionblock.jpg)

Session taint tracking ایک specific gap بند کرتی ہے جسے صرف access controls cover نہیں کرتے۔ جب agent CONFIDENTIAL classified document پڑھتا ہے تو وہ session اب CONFIDENTIAL تک tainted ہے۔ PUBLIC channel سے output بھیجنے کی کوئی بھی subsequent کوشش write-down check fail کرتی ہے، قطع نظر اس کے کہ model کو کیا کرنے کو کہا گیا اور قطع نظر اس کے کہ instruction کسی legitimate user سے آئی یا injected payload سے۔ Injection model کو data leak کرنے کو کہہ سکتا ہے۔ Enforcement layer پرواہ نہیں کرتی۔

Architectural framing اہم ہے: prompt injection attacks کی ایک class ہے جو model کے instruction-following behavior کو target کرتی ہے۔ صحیح defense یہ نہیں کہ model کو better instructions follow کرنا سکھائیں یا bad instructions کو زیادہ accurately detect کریں۔ صحیح defense یہ ہے کہ ان consequences کے set کو کم کریں جو model کے bad instructions follow کرنے سے result کر سکتے ہیں۔ آپ یہ actual tool calls، actual data flows، actual external communications کو ایک gate کے پیچھے رکھ کر کرتے ہیں جسے model influence نہیں کر سکتا۔

یہ ایک solvable problem ہے۔ Model کو trusted اور untrusted instructions کے درمیان reliably distinguish کرانا نہیں ہے۔
