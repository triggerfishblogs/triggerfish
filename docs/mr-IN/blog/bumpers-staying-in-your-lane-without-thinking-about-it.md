---
title: "Bumpers: त्याबद्दल विचार न करता तुमच्या Lane मध्ये राहणे"
date: 2026-03-08
description: Triggerfish bumpers तुमचा agent तुम्ही असलेल्या level वर काम करत ठेवतात.
  अपघाती escalation नाही, surprises नाहीत. जेव्हा जास्त आवश्यक आहे तेव्हा toggle off करा. Default on आहेत.
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

AI agents genuinely useful करणारी गोष्ट म्हणजे तीच जी त्यांना अधूनमधून alarming करते. Agent ला तुमच्या tools चा access द्या आणि ते त्यांचा वापर करेल. Task ला असे वाटल्यास, सर्व. तुम्ही message draft करण्यास मदत मागता आणि ते availability check करण्यासाठी तुमच्या calendar मध्ये शिरतो, एखाद्या file मधून काही context खेचतो, Slack thread check करतो. तुम्हाला कळण्यापूर्वी, एक simple task तीन वेगळ्या classification levels वर तीन data sources touch झाले आहेत आणि तुमचा session आता तुमचा हेतू नसलेल्या level ला tainted आहे.

हे bug नाही. हे agent त्याचे काम करत आहे. पण हे एक real usability problem create करते: casual काम करत असल्यास आणि तुम्हाला accidentally confidential data play मध्ये आलेल्या context मध्ये escalate नको असल्यास, एकतर agent सतत micromanage करायला हवे किंवा sessions drift होतो हे accept करावे लागते.

Bumpers ते fix करतात.

![](/blog/images/screenshot_20260309_161249.png)

ही idea सरळ bowling मधून आली आहे. Bumpers ठेवल्यावर, ball lane मध्ये राहतो. Lane च्या आत कुठेही जाऊ शकतो, bounce होऊ शकतो, त्याचे काम करू शकतो. फक्त gutter मध्ये पडू शकत नाही. Triggerfish मधील Bumpers त्याच प्रकारे काम करतात. ते on असताना, agent current session च्या classification level वर किंवा खाली operate करणारे काहीही करू शकतो. जे करू शकत नाही ते म्हणजे session taint escalate करणारी action घेणे. प्रयत्न केल्यास, action execute होण्यापूर्वी blocked होतो आणि agent ला सांगितले जाते की दुसरा मार्ग शोधा किंवा तुम्हाला कळवा की पुढे जाण्यासाठी bumpers drop करावे लागतील.

Bumpers default on आहेत. तुमचा session सुरू झाल्यावर, तुम्हाला "Bumpers deployed." दिसेल. Agent ला full range of motion द्यायचे असल्यास, /bumpers run करा आणि ते निघतात. पुन्हा run करा आणि परत येतात. तुमची preference sessions मध्ये persist होते, त्यामुळे तुम्ही नेहमी त्यांच्याशिवाय काम करत असल्यास, ते फक्त एकदाच set करायचे आहे.

Bumpers काय करतात आणि काय करत नाहीत हे समजून घेणे महत्त्वाचे आहे. ते agent वर general-purpose restriction नाही. ते कोणते tools call करू शकतो, कोणते data read करू शकतो, किंवा current classification level च्या आत काय handle करतो ते limit करत नाहीत. तुमचा session CONFIDENTIAL ला आधीच tainted असल्यास आणि agent दुसरा CONFIDENTIAL resource access केल्यास, bumpers ला त्याबद्दल काहीही सांगायचे नाही. Taint move होत नाही. Bumpers फक्त escalation बद्दल care करतात.

![](/blog/images/gemini_generated_image_4ovbs34ovbs34ovb.jpg)

हे महत्त्वाचे आहे कारण bumpers तुमच्या मार्गात येणार नाहीत असे designed आहेत. संपूर्ण मुद्दा असतो की normal working session दरम्यान classification levels बद्दल विचार करायला नको. तुम्ही bumpers on ठेवा, काम करा, आणि agent तुमच्या session चे nature बदलणाऱ्या गोष्टीसाठी पोहोचल्यास ते थांबते आणि तुम्हाला सांगते. तुम्ही unlock करायचे का ते decide करा. हाच संपूर्ण interaction आहे.

एक edge case जाणून घेण्यासारखा आहे. Mid-session bumpers off केल्यास आणि agent taint escalate केल्यास, bumpers पुन्हा on केल्याने taint खाली येत नाही. Taint monotonic आहे. ते फक्त वर जाते. त्यामुळे bumpers disable केल्यास, higher level वर काम केल्यास, आणि पुन्हा enable केल्यास, bumpers आता त्या higher level पासून guard करत आहेत, original पासून नाही. Clean low-level session वर परत यायचे असल्यास, full reset करा.

![](/blog/images/screenshot_20260309_164720.png)

बहुतेक लोकांसाठी, bumpers म्हणजे एक गोष्ट quietly on आहे आणि अधूनमधून agent ने automatically केले नाही कारण सांगितले. हाच intended experience आहे. Agent lane मध्ये राहतो, तुम्ही control मध्ये राहता, आणि तुम्हाला active decision तेव्हाच करायचे असते जेव्हा तुम्हाला खरोखर पुढे जायचे असते.
