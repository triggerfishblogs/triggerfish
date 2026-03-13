---
title: "Bumpers: ಅದರ ಬಗ್ಗೆ ಯೋಚಿಸದೆ ನಿಮ್ಮ Lane ನಲ್ಲಿ ಉಳಿಯುವುದು"
date: 2026-03-08
description: Triggerfish bumpers ನಿಮ್ಮ agent ಅನ್ನು ನೀವಿರುವ level ನಲ್ಲಿ ಕೆಲಸ
  ಮಾಡಲು ಇರಿಸುತ್ತವೆ. ಆಕಸ್ಮಿಕ escalation ಇಲ್ಲ, surprises ಇಲ್ಲ. ಹೆಚ್ಚು ಬೇಕಾದಾಗ
  ಅವುಗಳನ್ನು toggle off ಮಾಡಿ. Default ಆಗಿ on.
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

AI agents ಅನ್ನು genuinely useful ಮಾಡುವ ಸಂಗತಿಯೇ ಕೆಲವೊಮ್ಮೆ ಅಚ್ಚರಿ ಮೂಡಿಸುವಂತದ್ದು. Agent ಗೆ ನಿಮ್ಮ tools ಗೆ access ನೀಡಿದರೆ ಅದು ಅವುಗಳನ್ನು ಬಳಸುತ್ತದೆ. Task ಗೆ ಸೂಕ್ತ ಅನ್ನಿಸಿದರೆ ಎಲ್ಲವನ್ನೂ ಬಳಸುತ್ತದೆ. Message draft ಮಾಡಲು ಸಹಾಯ ಕೇಳಿದರೆ availability check ಮಾಡಲು calendar ನಲ್ಲಿ ಕೈ ಹಾಕುತ್ತದೆ, file ನಿಂದ ಕೆಲವು context ತೆಗೆಯುತ್ತದೆ, Slack thread check ಮಾಡುತ್ತದೆ. ಗೊತ್ತಾಗುವ ಮೊದಲೇ, ಒಂದು ಸರಳ task ಮೂರು ಭಿನ್ನ classification levels ನಲ್ಲಿ ಮೂರು ಭಿನ್ನ data sources touch ಮಾಡಿ ನಿಮ್ಮ session ಈಗ ನೀವು ಉದ್ದೇಶಿಸಿದ level ಗೆ tainted ಆಗಿದೆ.

ಇದು bug ಅಲ್ಲ. Agent ತನ್ನ ಕೆಲಸ ಮಾಡುತ್ತಿದೆ. ಆದರೆ ಇದು real usability problem ರಚಿಸುತ್ತದೆ: ನೀವು casual work ಮಾಡುತ್ತಿದ್ದರೆ ಮತ್ತು confidential data in play ಆಗಿರುವ context ಗೆ accidentally escalate ಆಗಲು ಬಯಸದಿದ್ದರೆ, agent ಅನ್ನು constantly micromanage ಮಾಡಬೇಕಾಗುತ್ತದೆ ಅಥವಾ sessions drift ಆಗುತ್ತವೆ ಎಂದು accept ಮಾಡಬೇಕಾಗುತ್ತದೆ.

Bumpers ಅದನ್ನು fix ಮಾಡುತ್ತವೆ.

![](/blog/images/screenshot_20260309_161249.png)

ಈ idea ನೇರವಾಗಿ bowling ನಿಂದ ಬಂದಿದೆ. Bumpers ಇಟ್ಟಾಗ, ball lane ನಲ್ಲಿ ಉಳಿಯುತ್ತದೆ. Lane ಒಳಗೆ ಎಲ್ಲಿ ಬೇಕಾದರೂ ಹೋಗಬಹುದು, bounce ಮಾಡಬಹುದು, ತನ್ನ ಕೆಲಸ ಮಾಡಬಹುದು. ಆದರೆ gutter ಗೆ ಬೀಳಲಾಗುವುದಿಲ್ಲ. Triggerfish ನಲ್ಲಿ bumpers ಅದೇ ರೀತಿ ಕಾರ್ಯ ನಿರ್ವಹಿಸುತ್ತವೆ. Bumpers on ಇದ್ದಾಗ, agent ಪ್ರಸ್ತುತ session ನ classification level ನಲ್ಲಿ ಅಥವಾ ಕೆಳಗೆ operate ಮಾಡುವ ಯಾವ ಕೆಲಸ ಮಾಡಬಹುದು. Session taint escalate ಮಾಡುವ action ತೆಗೆದುಕೊಳ್ಳಲು ಮಾತ್ರ ಸಾಧ್ಯವಿಲ್ಲ. Try ಮಾಡಿದರೆ, execute ಆಗುವ ಮೊದಲು action block ಮಾಡಲಾಗುತ್ತದೆ ಮತ್ತು ಬೇರೆ ವಿಧಾನ ಕಂಡುಹಿಡಿಯಲು ಅಥವಾ ಮುಂದೆ ಹೋಗಲು bumpers drop ಮಾಡಬೇಕಾಗುತ್ತದೆ ಎಂದು agent ಗೆ ತಿಳಿಸಲಾಗುತ್ತದೆ.

Bumpers default ಆಗಿ on ಆಗಿರುತ್ತವೆ. Session ಪ್ರಾರಂಭದಲ್ಲಿ "Bumpers deployed." ಎಂದು ತೋರಿಸಲಾಗುತ್ತದೆ. Agent ಗೆ full range of motion ನೀಡಲು ಬಯಸಿದರೆ, /bumpers ಚಲಾಯಿಸಿ ಮತ್ತು ಅವು ಕಳಚಿಕೊಳ್ಳುತ್ತವೆ. ಮತ್ತೆ ಚಲಾಯಿಸಿದರೆ ಮತ್ತೆ on ಆಗುತ್ತವೆ. ನಿಮ್ಮ preference sessions ಮೇಲೆ persist ಆಗುತ್ತದೆ, ಆದ್ದರಿಂದ ಯಾವಾಗಲೂ ಅವಿಲ್ಲದೆ ಕೆಲಸ ಮಾಡಲು ಬಯಸುವ ಜನರಿಗೆ ಒಮ್ಮೆ ಮಾತ್ರ set ಮಾಡಬೇಕು.

Bumpers ಏನು ಮಾಡುತ್ತವೆ ಮತ್ತು ಮಾಡುವುದಿಲ್ಲ ಎಂಬ ಮುಖ್ಯ ವಿಷಯ ಅರ್ಥ ಮಾಡಿಕೊಳ್ಳಬೇಕು. ಅವು agent ಮೇಲೆ general-purpose restriction ಅಲ್ಲ. Agent call ಮಾಡಬಹುದಾದ tools, read ಮಾಡಬಹುದಾದ data, ಅಥವಾ ಪ್ರಸ್ತುತ classification level ಒಳಗೆ ಯಾವ ಸಂಗತಿ handle ಮಾಡುತ್ತದೆ ಎಂಬುದನ್ನು ಅವು limit ಮಾಡುವುದಿಲ್ಲ. Session ಈಗಾಗಲೇ CONFIDENTIAL ಗೆ tainted ಆಗಿದ್ದರೆ ಮತ್ತು agent ಇನ್ನೊಂದು CONFIDENTIAL resource access ಮಾಡಿದರೆ, bumpers ಅದರ ಬಗ್ಗೆ ಏನೂ ಹೇಳುವುದಿಲ್ಲ. Taint move ಆಗುತ್ತಿಲ್ಲ. Bumpers ಕೇವಲ escalation ಬಗ್ಗೆ ಕಾಳಜಿ ಮಾಡುತ್ತವೆ.

![](/blog/images/gemini_generated_image_4ovbs34ovbs34ovb.jpg)

ಇದು ಮುಖ್ಯ ಏಕೆಂದರೆ bumpers ನಿಮ್ಮ ದಾರಿಯಿಂದ ಹೊರಗೆ ಇರಲು design ಮಾಡಲಾಗಿದೆ. ಸಂಪೂರ್ಣ ಉದ್ದೇಶ ಏನೆಂದರೆ normal working session ಸಮಯದಲ್ಲಿ classification levels ಬಗ್ಗೆ ಯೋಚಿಸಬೇಕಾಗಿಲ್ಲ. Bumpers on ಇಟ್ಟು ಕೆಲಸ ಮಾಡಿ, ಮತ್ತು agent ನಿಮ್ಮ session ನ nature ಬದಲಿಸುವ ಸಂಗತಿಗೆ reach ಮಾಡಿದರೆ ಅದು ನಿಂತು ನಿಮಗೆ ತಿಳಿಸುತ್ತದೆ. ಅದನ್ನು unlock ಮಾಡಬೇಕೇ ಎಂದು ನೀವು decide ಮಾಡಿ. ಅಷ್ಟೇ interaction.

ತಿಳಿದಿರಬೇಕಾದ ಒಂದು edge case ಇದೆ. Session ಮಧ್ಯದಲ್ಲಿ bumpers off ಮಾಡಿ agent taint escalate ಮಾಡಿದರೆ, bumpers ಮತ್ತೆ on ಮಾಡಿದರೆ taint ಹಿಂದಕ್ಕೆ ಬರುವುದಿಲ್ಲ. Taint monotonic. ಕೇವಲ ಮೇಲೆ ಹೋಗುತ್ತದೆ. ಆದ್ದರಿಂದ bumpers disable ಮಾಡಿ, higher level ನಲ್ಲಿ ಕೆಲಸ ಮಾಡಿ, ಮತ್ತೆ enable ಮಾಡಿದರೆ, bumpers ಈಗ ಆ higher level ನಿಂದ guard ಮಾಡುತ್ತಿವೆ, original ಅಲ್ಲ. Clean low-level session ಗೆ ಹಿಂದಕ್ಕೆ ಹೋಗಲು ಬಯಸಿದರೆ, full reset ಮಾಡಿ.

![](/blog/images/screenshot_20260309_164720.png)

ಹೆಚ್ಚಿನ ಜನರಿಗೆ, bumpers ಸದ್ದಿಲ್ಲದೆ on ಆಗಿ ಕೆಲವೊಮ್ಮೆ agent ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಮಾಡುವ ಬದಲು ಏನನ್ನಾದರೂ enable ಮಾಡಲು ಕೇಳಿದ ಏಕೆ ಎಂದು ವಿವರಿಸುವ ಒಂದು ಸಂಗತಿ ಆಗಿರುತ್ತವೆ. ಅದೇ intended experience. Agent lane ನಲ್ಲಿ ಉಳಿಯುತ್ತದೆ, ನೀವು control ನಲ್ಲಿ ಉಳಿಯುತ್ತೀರಿ, ಮತ್ತು ಮುಂದೆ ಹೋಗಲು ನಿಜವಾಗಿ ಬಯಸಿದಾಗ ಮಾತ್ರ active decision ಮಾಡಬೇಕಾಗುತ್ತದೆ.
