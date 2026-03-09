---
title: Ginawa Ko 'Yung AI Agent na Wish Kong Nag-exist
date: 2026-03-09
description: Ginawa ko ang Triggerfish kasi lahat ng AI agent na nakita ko,
  pinagkakatiwalaan 'yung model na i-enforce ang sarili niyang rules. Hindi 'yun
  security. Ito 'yung ginawa ko instead.
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
Ilang panahon na ang nakalipas, sinimulan kong pag-aralan nang mabuti kung ano talaga ang kaya ng mga AI agent. Hindi 'yung mga demo. 'Yung totoong naka-deploy, tumatakbo sa real data, sa real environments kung saan may consequences kapag nagkamali. Ang na-discover ko: legit na capable sila. Puwede mong i-connect ang isang agent sa email mo, calendar, code, at files, tapos makakagawa talaga siya ng meaningful na trabaho. Impressed ako doon.

Ang hindi ako na-impress? 'Yung security model. O mas tamang sabihin, 'yung kawalan nito. Lahat ng platform na tiningnan ko, iisa lang ang paraan ng pag-enforce ng rules: sinasabi sa model kung ano ang bawal. Sumulat ka ng magandang system prompt, i-describe mo ang boundaries, tapos trust mo na lang na susundin ng model. Gumagana 'yan hanggang may mag-figure out kung paano mag-phrase ng request na mako-convince ang model na hindi applicable ang rules sa specific case na 'to. At nafi-figure out naman ng mga tao 'yan. Hindi naman mahirap.

Naghintay ako na may ibang gumawa ng version na gusto ko talagang gamitin. 'Yung kaya mag-connect sa lahat, gumagana sa lahat ng channel na ginagamit ko na, at kayang mag-handle ng talagang sensitive na data nang hindi ako nag-cross fingers na sana okay ang araw ng model. Hindi dumating.

Kaya ginawa ko na lang.

Ang Triggerfish ang agent na gusto ko. Nagco-connect sa email mo, calendar, files, code, at messaging apps. Proactively gumagana, hindi lang kapag nag-prompt ka. Gumagana kung saan ka na gumagawa. Pero ang pinaka-seryoso kong tinake ay ang security architecture. Ang rules tungkol sa kung ano ang puwedeng i-access ng agent at kung saan puwedeng mag-flow ang data, wala sa prompt. Nasa enforcement layer siya na nasa labas ng model entirely. Sinasabi ng model sa system kung ano ang gusto niyang gawin, at isang separate na layer ang nagde-decide kung papayagan ba talaga. Hindi maka-negotiate ang model sa layer na 'yun. Hindi niya ma-reason around. Hindi niya makita.

Mas malaki ang significance ng distinction na 'yan kaysa sa pakinggan. Ibig sabihin, hindi bumababa ang security properties ng system habang lumalakas ang model. Ibig sabihin, hindi mako-convince ng isang compromised third-party tool ang agent na gawin ang hindi niya dapat gawin. Ibig sabihin, kaya mong talagang basahin ang rules, intindihin, at pagkatiwalaan -- kasi code 'yun, hindi prose.

In-open-source ko ang enforcement core dahil exactly diyan. Kung hindi mo mababasa, hindi mo mapagkakatiwalaan. Totoo 'yan sa kahit anong security claim, at lalo na totoo kapag ang sini-secure mo ay isang autonomous agent na may access sa pinaka-sensitive mong data.

Libre ang platform para sa individuals at puwede mo siyang i-run mag-isa. Kung ayaw mong isipin ang infrastructure, may subscription option kung saan kami ang bahala sa model at search. Either way, iisa lang ang security model.

Ito ang agent na wish kong nag-exist dalawang taon na ang nakalipas. Sa tingin ko, maraming tao ang naghihintay ng ganito rin.
