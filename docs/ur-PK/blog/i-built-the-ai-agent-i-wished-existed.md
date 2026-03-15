---
title: میں نے وہ AI Agent بنایا جس کی مجھے تمنا تھی
date: 2026-03-08
description: میں نے Triggerfish اس لیے بنایا کیونکہ ہر AI agent جو مجھے ملا وہ
  model پر اپنے rules enforce کرنے کا بھروسہ کرتا تھا۔ یہ security نہیں ہے۔ میں
  نے اس کی بجائے کیا کیا۔
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

کچھ عرصہ پہلے میں نے AI agents کی حقیقی صلاحیتوں پر قریب سے توجہ دینا شروع کیا۔ Demos نہیں۔ حقیقی ones، حقیقی data پر چلتے ہوئے، حقیقی environments میں جہاں غلطیوں کے نتائج ہوتے ہیں۔ جو میں نے پایا وہ یہ تھا کہ capability واقعی موجود تھی۔ آپ ایک agent کو اپنے email، calendar، code، files سے connect کر سکتے تھے، اور یہ meaningful کام کر سکتا تھا۔ یہ حصہ مجھے impress کرتا تھا۔

جو مجھے impress نہیں کرتا تھا وہ security model تھا۔ یا بلکہ، اس کی غیر موجودگی۔ ہر platform جسے میں نے دیکھا وہ اپنے rules ایک ہی طریقے سے enforce کر رہا تھا: model کو بتا کر کہ اسے کیا نہیں کرنا چاہیے۔ ایک اچھا system prompt لکھو، boundaries describe کرو، model پر trust کرو کہ وہ ان کے اندر رہے گا۔ یہ اس وقت تک کام کرتا ہے جب تک کوئی یہ نہیں سوچتا کہ request کو کیسے phrase کیا جائے جو model کو یہ باور کرائے کہ rules یہاں، ابھی، اس مخصوص case میں apply نہیں ہوتے۔ اور لوگ یہ سمجھ لیتے ہیں۔ یہ اتنا مشکل نہیں۔

میں کسی کا انتظار کرتا رہا کہ اس کی وہ version بنائے جو میں actually استعمال کرنا چاہتا تھا۔ ایک جو ہر چیز سے connect ہو سکے، ہر channel پر کام کرے جو میں پہلے سے استعمال کر رہا ہوں، اور genuinely sensitive data handle کرے بغیر میرے fingers cross کرنے اور یہ امید کرنے کے کہ model اچھے دن میں ہے۔ یہ سامنے نہیں آیا۔

تو میں نے خود بنایا۔

Triggerfish وہ agent ہے جو میں چاہتا تھا۔ یہ آپ کے email، calendar، files، code، messaging apps سے connect ہوتا ہے۔ یہ proactively چلتا ہے، نہ کہ صرف جب آپ اسے prompt کریں۔ یہ وہاں کام کرتا ہے جہاں آپ پہلے سے کام کرتے ہیں۔ لیکن وہ حصہ جس کے بارے میں میں سب سے زیادہ serious ہوں security architecture ہے۔ جو rules agent کیا access کر سکتا ہے اور data کہاں flow کر سکتا ہے ان کے بارے میں وہ prompt میں نہیں ہیں۔ وہ ایک enforcement layer میں ہیں جو model سے باہر بیٹھتا ہے۔ Model system کو بتاتا ہے کہ وہ کیا کرنا چاہتا ہے، اور ایک الگ layer فیصلہ کرتی ہے کہ آیا یہ actually ہو گا۔ Model اس layer سے negotiate نہیں کر سکتا۔ یہ اس کے گرد reason نہیں کر سکتا۔ یہ اسے دیکھ نہیں سکتا۔

یہ distinction اس سے زیادہ اہم ہے جتنی لگتی ہے۔ اس کا مطلب ہے system کی security properties اس کے ساتھ degrade نہیں ہوتیں جیسے model زیادہ capable ہوتا ہے۔ اس کا مطلب ہے کہ کوئی compromised third-party tool agent کو کچھ ایسا کرنے پر نہیں منا سکتا جو اسے نہیں کرنا چاہیے۔ اس کا مطلب ہے آپ rules کو actually دیکھ سکتے ہیں، انہیں سمجھ سکتے ہیں، اور ان پر trust کر سکتے ہیں، کیونکہ یہ code ہیں، prose نہیں۔

میں نے enforcement core کو open-source کیا بالکل اسی وجہ سے۔ اگر آپ اسے پڑھ نہیں سکتے، تو آپ پر trust نہیں کر سکتے۔ یہ کسی بھی security claim کے بارے میں سچ ہے، اور یہ خاص طور پر سچ ہے جب آپ جو چیز secure کر رہے ہیں وہ ایک autonomous agent ہے جس کا آپ کے سب سے sensitive data تک access ہے۔

Platform individuals کے لیے مفت ہے اور آپ اسے خود چلا سکتے ہیں۔ اگر آپ infrastructure کے بارے میں نہیں سوچنا چاہتے تو ایک subscription option ہے جہاں ہم model اور search handle کرتے ہیں۔ کسی بھی صورت میں، security model ایک ہی ہے۔

یہ وہ agent ہے جس کی مجھے اس وقت تمنا تھی۔ میرا خیال ہے بہت سے لوگ ایک ہی چیز کا انتظار کر رہے تھے۔
