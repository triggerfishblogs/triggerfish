---
title: "Bumpers: بغیر سوچے اپنی lane میں رہنا"
date: 2026-03-08
description: Triggerfish bumpers آپ کے agent کو اسی level پر رکھتے ہیں جہاں آپ کام
  کر رہے ہیں۔ کوئی accidental escalation نہیں، کوئی surprise نہیں۔ ضرورت پڑنے پر
  انہیں بند کریں۔ ڈیفالٹ طور پر on ہیں۔
author: Greg Havens
tags:
  - ai agents
  - security
  - classification
  - bumpers
  - triggerfish
draft: false
---
![](/blog/images/chatgpt-image-mar-9-2026-04_07_56-pm.jpg "Title Graphic on Bumpers Keeping you in your lane")

جو چیز AI agents کو واقعی مفید بناتی ہے وہی کبھی کبھی انہیں پریشان کن بھی بناتی ہے۔ Agent کو اپنے tools کا access دیں اور وہ انہیں استعمال کرے گا۔ سب کو، اگر کام ایسا لگے۔ آپ اسے کوئی message draft کرنے میں مدد کے لیے کہتے ہیں اور وہ availability چیک کرنے کے لیے آپ کے calendar میں جھانکتا ہے، کسی file سے context لیتا ہے، ایک Slack thread چیک کرتا ہے۔ ابھی معلوم نہیں ہوتا اور ایک سادہ کام تین مختلف classification levels کے تین مختلف data sources کو چھو چکا ہوتا ہے، اور آپ کا session اس level تک taint ہو جاتا ہے جہاں آپ کام کرنے کا ارادہ نہیں رکھتے تھے۔

یہ کوئی bug نہیں۔ Agent اپنا کام کر رہا ہے۔ لیکن یہ ایک حقیقی usability مسئلہ پیدا کرتا ہے: اگر آپ عام کام کر رہے ہیں اور غلطی سے ایسے context میں نہیں جانا چاہتے جہاں آپ کا confidential data زیر استعمال ہو، تو آپ کو یا تو agent کو مسلسل micromanage کرنا ہوگا یا یہ قبول کرنا ہوگا کہ sessions drift کرتے ہیں۔

Bumpers اسے ٹھیک کرتے ہیں۔

![](/blog/images/screenshot_20260309_161249.png)

یہ خیال سیدھا bowling سے آیا ہے۔ جب آپ bumpers لگاتے ہیں تو گیند lane میں رہتی ہے۔ یہ lane کے اندر کہیں بھی جا سکتی ہے، bounce کر سکتی ہے، اپنا کام کر سکتی ہے۔ بس gutter میں نہیں گر سکتی۔ Triggerfish میں bumpers بالکل اسی طرح کام کرتے ہیں۔ جب یہ on ہوں تو agent کچھ بھی کر سکتا ہے جو موجودہ session کی classification level پر یا اس سے نیچے کام کرے۔ جو نہیں کر سکتا وہ ایسا action ہے جو session taint escalate کرے۔ اگر وہ کوشش کرے تو action execute ہونے سے پہلے block ہو جاتا ہے اور agent کو کہا جاتا ہے کہ کوئی اور راستہ ڈھونڈے یا آپ کو بتائے کہ آگے جانے کے لیے bumpers ہٹانے ہوں گے۔

Bumpers ڈیفالٹ طور پر on ہوتے ہیں۔ جب آپ کا session شروع ہوتا ہے تو آپ "Bumpers deployed." دیکھیں گے۔ اگر آپ agent کو پوری آزادی دینا چاہتے ہیں تو `/bumpers` چلائیں اور یہ ہٹ جاتے ہیں۔ دوبارہ چلائیں اور واپس لگ جاتے ہیں۔ آپ کی preference sessions میں persist رہتی ہے، اس لیے اگر آپ ہمیشہ بغیر bumpers کے کام کرتے ہیں تو یہ صرف ایک بار set کرنا ہے۔

یہ سمجھنا ضروری ہے کہ bumpers کیا کرتے ہیں اور کیا نہیں۔ یہ agent پر general-purpose restriction نہیں ہیں۔ یہ agent کے callable tools، readable data، یا موجودہ classification level کے اندر کسی بھی چیز کو limit نہیں کرتے۔ اگر آپ کا session پہلے سے CONFIDENTIAL تک taint ہے اور agent کوئی اور CONFIDENTIAL resource access کرے تو bumpers کو کچھ نہیں کہنا۔ Taint نہیں بڑھ رہا۔ Bumpers صرف escalation کی پرواہ کرتے ہیں۔

![](/blog/images/gemini_generated_image_4ovbs34ovbs34ovb.jpg)

یہ اہم ہے کیونکہ bumpers آپ کے راستے سے دور رہنے کے لیے بنائے گئے ہیں۔ پورا مقصد یہ ہے کہ آپ کو عام کام کے دوران classification levels کے بارے میں سوچنا نہ پڑے۔ آپ bumpers on کریں، کام کریں، اور اگر agent کوئی ایسی چیز کرنے کی کوشش کرے جو آپ کے session کی نوعیت بدل دے تو وہ رک کر آپ کو بتائے۔ آپ فیصلہ کریں کہ اسے unlock کرنا ہے۔ یہی پورا interaction ہے۔

ایک edge case جاننے کے قابل ہے۔ اگر آپ mid-session bumpers off کریں اور agent taint escalate کر دے تو bumpers واپس on کرنے سے taint نیچے نہیں آتا۔ Taint monotonic ہے۔ یہ صرف اوپر جاتا ہے۔ اس لیے اگر آپ bumpers disable کریں، کچھ کام higher level پر کریں، اور دوبارہ enable کریں تو bumpers اب اس اصل level سے نہیں بلکہ اس higher level سے guard کر رہے ہیں۔ اگر آپ clean low-level session پر واپس جانا چاہتے ہیں تو full reset کریں۔

![](/blog/images/screenshot_20260309_164720.png)

زیادہ تر لوگوں کے لیے، bumpers بس وہ چیز ہوں گے جو خاموشی سے on رہے اور کبھی کبھی سمجھائیں کہ agent نے خود کام کرنے کی بجائے انہیں کچھ enable کرنے کو کیوں کہا۔ یہی مقصود تجربہ ہے۔ Agent lane میں رہتا ہے، آپ control میں رہتے ہیں، اور آپ کو صرف اس وقت فعال فیصلہ کرنا ہے جب آپ واقعی آگے جانا چاہتے ہیں۔
