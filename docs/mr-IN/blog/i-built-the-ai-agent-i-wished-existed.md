---
title: मी Exist व्हावा असे वाटलेला AI Agent मी बनवला
date: 2026-03-08
description: मी Triggerfish बनवला कारण मला सापडलेल्या प्रत्येक AI agent ने model वर
  स्वतःचे rules enforce करण्यासाठी trust केले. ते security नाही. मी त्याऐवजी काय केले ते येथे आहे.
author: Greg Havens
tags:
  - ai
  - ai agents
  - security
  - open source
  - self-hosted
  - llm
  - prompt injection
  - agent security
  - triggerfish
draft: false
---
![](/blog/images/gemini_generated_image_ygq4uwygq4uwygq4.jpg)

काही वेळापूर्वी मी AI agents खरोखर काय करू शकतात याकडे लक्ष देऊ लागलो. Demos नाही. Real environment मध्ये, real data वर, real consequences असलेल्या environments मध्ये running असलेले real. मला आढळले ते म्हणजे capability genuinely तेथे होती. Agent ला email, calendar, code, files मध्ये wire करता येतो आणि meaningful काम करू शकतो. ती बाब मला impressed केली.

Security model impressed नाही केला. किंवा त्याची अनुपस्थिती. मी पाहिलेला प्रत्येक platform आपले rules त्याच प्रकारे enforce करत होता: model ला काय करण्याची सपोरवानगी नाही ते सांगून. चांगला system prompt लिहा, boundaries describe करा, model त्यांच्या आत राहील यावर trust करा. हे तोपर्यंत काम करते जोपर्यंत कोणी model ला rules येथे, आत्ता, या specific case मध्ये लागू नाहीत असे convince करणारा request phrase कसा करायचा ते figure out करत नाही. आणि लोक ते figure out करतात. ते खूप कठीण नाही.

मी कोणाला माझ्यासाठी actually वापरायला आवडेल असे version build करेल याची wait करत राहिलो. जे सर्वकाही connect करू शकतो, मी आधीच वापरत असलेल्या प्रत्येक channel मध्ये काम करतो, आणि model चांगला दिवस असेल अशी आशा ठेवण्याची आवश्यकता न करता genuinely sensitive data handle करतो. ते आले नाही.

त्यामुळे मी बनवले.

Triggerfish तो agent आहे जो मला हवा होता. तो email, calendar, files, code, messaging apps शी connect होतो. Proactively run होतो, फक्त prompt केल्यावर नाही. तुम्ही आधीच काम करता तेथे कार्य करतो. पण ज्या बाबत मी सर्वात serious आहे ती security architecture आहे. Agent काय access करू शकतो आणि data कोठे flow होऊ शकतो याचे rules prompt मध्ये राहत नाहीत. ते model बाहेर पूर्णपणे बसलेल्या enforcement layer मध्ये राहतात. Model system ला काय करायचे आहे ते सांगतो, आणि separate layer decide करतो ते actually होईल का. Model त्या layer शी negotiate करू शकत नाही. त्याभोवती reason करू शकत नाही. ते पाहू शकत नाही.

हा फरक वाटते त्यापेक्षा जास्त महत्त्वाचा आहे. याचा अर्थ system चे security properties model अधिक capable झाल्यावर degrade होत नाहीत. याचा अर्थ compromised third-party tool agent ला नको ते करण्यासाठी talk करू शकत नाही. याचा अर्थ तुम्ही rules वाचू शकता, समजू शकता, आणि trust करू शकता, कारण ते code आहेत, prose नाही.

मी exactly त्याच कारणासाठी enforcement core open-source केला. जर तुम्ही ते वाचू शकत नाही, तर trust करू शकत नाही. हे कोणत्याही security claim बद्दल खरे आहे, आणि तुम्ही secure करत असलेली गोष्ट तुमच्या सर्वात sensitive data ला access असलेला autonomous agent असल्यावर हे विशेषत: खरे आहे.

Platform individuals साठी free आहे आणि स्वतः run करता येतो. Infrastructure बद्दल विचार करायचा नसल्यास, एक subscription option आहे जेथे आम्ही model आणि search handle करतो. कोणत्याही प्रकारे, security model सारखाच आहे.

हा agent तेव्हा exist व्हावा असे मला वाटला होता. मला वाटतो की बरेच लोक त्याच गोष्टीची wait करत होते.
