---
title: Pagpapakilala ng mga Self-Healing Workflow sa Triggerfish
date: 2026-03-13
description: Ang mga self-healing workflow ng Triggerfish ay nagde-deploy ng live
  watcher agent sa bawat workflow run, nakakahuli ng mga pagkabigo sa konteksto at
  nagmumungkahi ng mga ayos nang hindi hinihinto ang pagpapatupad.
author: Greg Havens
tags:
  - workflow-automation
  - ai-agents
  - enterprise-it
  - self-healing
  - rpa
  - automation-maintenance
  - triggerfish
draft: false
---
Bawat enterprise automation program ay nakakaharap ng parehong pader. ServiceNow ticket routing, Terraform drift remediation, certificate rotation, AD group provisioning, SCCM patch deployment, CI/CD pipeline orchestration. Ang unang sampu o dalawampung workflow ay madaling nagbibigay-katwiran sa investment, at tumatalima ang ROI math hanggang lumampas sa daan-daan ang bilang ng mga workflow at malaking bahagi na ng linggo ng IT team ang napupunta sa pagpapanatili ng mga umiiral na automation kaysa sa pagbuo ng bago.

Nire-redesign ng isang payer portal ang auth flow nito at huminto sa pag-authenticate ang claims submission workflow. Nag-push ang Salesforce ng metadata update at nagsimulang magsulat ng mga null ang isang field mapping sa lead-to-opportunity pipeline. Nag-deprecate ang AWS ng isang API version at nagsimulang mag-throw ng 400 sa bawat apply ang isang Terraform plan na matagal nang tumatakbo nang maayos. May mag-fi-file ng ticket, may ibang mag-a-alamin kung ano ang nagbago, itatama, ite-test, ide-deploy ang fix, at samantala ang prosesong ina-automate nito ay manu-manong pinatakbo o hindi na tumakbo.

Ito ang maintenance trap, at istruktural ito sa halip na kabiguan ng implementasyon. Ang tradisyunal na automation ay sumusunod sa eksaktong mga landas, tumutugma sa eksaktong mga pattern, at nasisira sa sandaling lumihis ang realidad mula sa kung ano ang umiiral noong isinulat ang workflow. Konsistent ang pananaliksik: gumagastos ang mga organisasyon ng 70 hanggang 75 porsiyento ng kanilang kabuuang automation program costs hindi sa pagbuo ng mga bagong workflow kundi sa pagpapanatili ng mga mayroon na sila. Sa malalaking deployment, 45 porsiyento ng mga workflow ang nasisira bawat linggo.

Ang workflow engine ng Triggerfish ay itinayo para baguhin ito. Naipapadala na ngayon ang mga self-healing workflow, at kinakatawan nito ang pinakamahalagang kakayahan sa platform hanggang ngayon.

![](/blog/images/watcher-model-diagram.jpg)

## Ano Talaga ang Ibig Sabihin ng Self-Healing

Maluwag ang paggamit ng pariralang ito, kaya magiging diretsahan ako tungkol sa kung ano ito.

Kapag na-enable mo ang self-healing sa isang Triggerfish workflow, nagsa-spawn ang isang lead agent sa sandaling magsimulang tumakbo ang workflow na iyon. Hindi ito nagla-launch kapag may nasira; nagmamasid ito mula sa unang hakbang, tumatanggap ng live event stream mula sa engine habang umuusad ang workflow at inoobserba ang bawat hakbang nang real time.

Alam na ng lead ang buong workflow definition bago pa tumakbo ang kahit isang hakbang, kasama ang intensyon sa likod ng bawat hakbang, kung ano ang inaasahan ng bawat hakbang mula sa mga nauna dito, at kung ano ang ginagawa nito para sa mga susunod. Alam din nito ang kasaysayan ng mga nakaraang run: kung ano ang nagtagumpay, kung ano ang nabigo, kung anong mga patch ang iminungkahi at kung inaprubahan o tinanggihan ito ng tao. Kapag may natukoy itong bagay na kailangang aksyunan, nasa memorya na ang lahat ng kontekstong iyon dahil nagmamasid ito buong panahon sa halip na nire-reconstruct pagkatapos ng pangyayari.

Kapag may nagkamali, ini-triage ito ng lead. Ang isang flaky network call ay nire-retry nang may backoff. Ang isang nabagong API endpoint na maaaring masolusyunan ay nilulutas para sa run na ito. Ang isang istrukturang problema sa workflow definition ay nagkakaroon ng iminungkahing ayos na ina-apply para makumpleto ang run, na ang pagbabago ay isinusumite para sa iyong pag-apruba bago ito maging permanente. Ang isang sirang plugin integration ay nagkakaroon ng bagong o na-update na plugin na isinusulat at isinusumite para sa pagsusuri. Kung naubos na ng lead ang mga pagtatangka nito at hindi nalutas ang isyu, ine-escalate nito sa iyo na may istrukturadong diagnosis kung ano ang sinubukan nito at kung ano sa tingin nito ang root cause.

Patuloy na tumatakbo ang workflow hangga't ligtas itong magagawa. Kung naka-block ang isang hakbang, ang mga downstream step lang na umaasa dito ang humihinto habang nagpapatuloy ang mga parallel branch. Alam ng lead ang dependency graph at ang mga talagang naka-block lang ang pinapahinto nito.

## Bakit Mahalaga ang Kontekstong Inilalagay Mo sa mga Workflow

Ang dahilan kung bakit gumagana ang self-healing sa praktika ay dahil ang mga Triggerfish workflow ay nangangailangan ng mayamang step-level metadata mula sa sandaling isulat mo ang mga ito. Hindi ito opsyonal at hindi ito dokumentasyon para sa sarili nitong kapakanan; ito ang pinanggagalingan ng reasoning ng lead agent.

Bawat hakbang sa isang workflow ay may apat na kinakailangang field bukod sa mismong task definition: isang paglalarawan kung ano ang mekanikal na ginagawa ng hakbang, isang intent statement na nagpapaliwanag kung bakit umiiral ang hakbang na ito at anong layunin sa negosyo ang naihahatid nito, isang expects field na naglalarawan kung anong data ang inaasahan nitong natatanggap at sa anong estado dapat ang mga nakaraang hakbang, at isang produces field na naglalarawan kung ano ang isinusulat nito sa konteksto para magamit ng mga downstream step.

Ganito ang hitsura nito sa praktika. Sabihin nating ina-automate mo ang employee access provisioning. May bagong hire na magsisimula sa Lunes at kailangan ng workflow na lumikha ng mga account sa Active Directory, i-provision ang kanilang GitHub org membership, i-assign ang kanilang mga Okta group, at magbukas ng Jira ticket na nagko-confirm ng pagkumpleto. Isang hakbang ang kumukuha ng employee record mula sa iyong HR system. Ang intent field nito ay hindi lang nagsasabing "kunin ang employee record." Ganito ang nakasulat: "Ang hakbang na ito ang source of truth para sa bawat downstream provisioning decision. Ang role, department, at start date mula sa record na ito ang nagdedetermina kung aling mga AD group ang ia-assign, aling mga GitHub team ang ipo-provision, at aling mga Okta policy ang mag-a-apply. Kung nagbalik ang hakbang na ito ng luma o hindi kumpletong data, mali ang ipo-provision ng bawat downstream step na access."

![](/blog/images/employee-recrod.jpg)

Binabasa ng lead ang intent statement na iyon kapag nabigo ang hakbang at naiintindihan kung ano ang nakataya. Alam nito na ang isang partial record ay nangangahulugang tatakbo ang mga access provisioning step na may maling input, na posibleng magbigay ng maling mga permisyon sa isang totoong tao na magsisimula sa dalawang araw. Hinuhubog ng kontekstong iyon kung paano sumusubok na mag-recover, kung pauuntihin ba ang mga downstream step, at kung ano ang sasabihin nito sa iyo kung mag-e-escalate.

Ang isa pang hakbang sa parehong workflow ay sinusuri ang produces field ng HR fetch step at alam nitong inaasahan nito ang `.employee.role` at `.employee.department` bilang mga non-empty string. Kung nag-update ang iyong HR system ng API nito at nagsimulang ibalik ang mga field na iyon na naka-nest sa ilalim ng `.employee.profile.role`, made-detect ng lead ang schema drift, mag-a-apply ng runtime mapping para sa run na ito para maayos na ma-provision ang bagong hire, at magmumungkahi ng istrukturang ayos para i-update ang step definition. Hindi ka nagsulat ng schema migration rule o exception handling para sa partikular na kasong ito. Nag-reason ang lead dito mula sa kontekstong nandoon na.

Kaya naman mahalaga ang kalidad ng workflow authoring. Ang metadata ay hindi seremonya; ito ang gasolina na pinapatakbo ng self-healing system. Ang isang workflow na may mababaw na mga step description ay isang workflow na hindi kayang pag-isipan ng lead kapag kailangan.

## Ang Pagmamasid nang Live ay Nangangahulugang Nahuhuling ang mga Problema Bago pa Sila Maging mga Pagkabigo

Dahil nagmamasid ang lead nang real time, maaari itong kumilos sa mga mahinang senyales bago pa talagang masira ang mga bagay. Isang hakbang na dating nakukumpleto sa dalawang segundo ay apatnapung segundo na ngayon. Isang hakbang na nagbalik ng data sa bawat nakaraang run ay nagbalik ng walang laman na resulta. Isang conditional branch ang tinahak na hindi kailanman natinahak sa buong run history. Wala sa mga ito ang hard error at patuloy na tumatakbo ang workflow, ngunit mga senyales ang mga ito na may nagbago sa environment. Mas mabuting hulihin ang mga ito bago subukan ng susunod na hakbang na gamitin ang masamang data.

Ang sensitivity ng mga pagsusuring ito ay nako-configure sa bawat workflow. Ang isang nightly report generation ay maaaring may maluwag na mga threshold habang ang isang access provisioning pipeline ay nagmamasid nang mabuti. Ikaw ang nagtatakda kung anong antas ng paglihis ang nararapat sa atensyon ng lead.

![](/blog/images/self-healing-workflow.jpg)

## Workflow Mo Pa Rin Ito

Hindi maaaring baguhin ng lead agent at ng team nito ang iyong canonical workflow definition nang walang iyong pag-apruba. Kapag nagmungkahi ang lead ng istrukturang ayos, ina-apply nito ang ayos para makumpleto ang kasalukuyang run at isinusumite ang pagbabago bilang isang proposal. Nakikita mo ito sa iyong queue, nakikita mo ang reasoning, inaprubahan o tinatanggihan mo ito. Kung tinanggihan mo ito, naitatala ang pagtangging iyon at alam ng bawat lead sa hinaharap na nagtatrabaho sa workflow na iyon na huwag nang imungkahi ang parehong bagay.

May isang bagay na hindi kailanman mababago ng lead anuman ang configuration: ang sarili nitong mandato. Ang self-healing policy sa workflow definition, kung magpo-pause ba, gaano katagal mag-re-retry, kung kailangan ba ng pag-apruba, ay owner-authored policy. Maaaring mag-patch ng task definition ang lead, mag-update ng mga API call, mag-adjust ng mga parameter, at magsulat ng mga bagong plugin. Hindi nito mababago ang mga panuntunang gumagabay sa sarili nitong pag-uugali. Hard-coded ang hangganan na iyon. Ang isang agent na maaaring mag-disable ng approval requirement na gumagabay sa sarili nitong mga proposal ay gagawing walang kabuluhan ang buong trust model.

Ang mga pagbabago sa plugin ay sumusunod sa parehong approval path tulad ng anumang plugin na isinulat ng isang agent sa Triggerfish. Ang katotohanan na ang plugin ay isinulat para ayusin ang isang sirang workflow ay hindi nagbibigay dito ng espesyal na tiwala. Dumadaan ito sa parehong review na parang humiling ka sa isang agent na gumawa ng bagong integration mula sa simula.

## Pamamahala Nito sa Bawat Channel na Ginagamit Mo Na

Hindi ka dapat kailangang mag-log in sa isang hiwalay na dashboard para malaman kung ano ang ginagawa ng iyong mga workflow. Ang mga self-healing notification ay dumarating kung saan mo na-configure ang Triggerfish na maabot ka: isang intervention summary sa Slack, isang approval request sa Telegram, isang escalation report sa email. Pumupunta sa iyo ang sistema sa channel na akma sa urgency nang hindi mo nire-refresh ang isang monitoring console.

Ang workflow status model ay itinayo para dito. Ang status ay hindi isang flat string kundi isang structured object na nagdadala ng lahat ng kailangan ng isang notification para maging makabuluhan: ang kasalukuyang estado, ang health signal, kung may patch ba sa iyong approval queue, ang kinalabasan ng huling run, at kung ano ang kasalukuyang ginagawa ng lead. Ang iyong Slack message ay maaaring magsabing "naka-pause ang access provisioning workflow, nagsusulat ng plugin fix ang lead, kakailanganin ang pag-apruba" sa isang notification lang nang hindi na kailangang maghanap pa ng konteksto.

![](/blog/images/workflow-status-reporting.jpg)

Ang parehong structured status na iyon ang nagpapakain sa live Tidepool interface kapag gusto mo ng buong larawan. Parehong data, ibang surface.

## Ano Talaga ang Binabago Nito para sa mga IT Team

Ang mga tao sa iyong organisasyon na ginugugol ang kanilang linggo sa pag-aayos ng mga sirang workflow ay hindi gumagawa ng mababang-kasanayan na trabaho. Nagde-debug sila ng mga distributed system, nagbabasa ng mga API changelog, at nire-reverse-engineer kung bakit ang isang workflow na maayos na tumakbo kahapon ay nabigo ngayon. Iyon ay mahalagang paghatol, at sa ngayon halos buong-buo itong ginagamit sa pagpapanatiling buhay ng mga umiiral na automation sa halip na pagbuo ng bagong automation o paglutas ng mas mahirap na mga problema.

Hindi inaalis ng mga self-healing workflow ang paghatol na iyon, ngunit binabago nito kung kailan ito ina-apply. Sa halip na mag-firefight ng sirang workflow sa hatinggabi, nagre-review ka ng iminungkahing ayos sa umaga at nagdedesisyon kung tama ang diagnosis ng lead. Ikaw ang approver ng iminungkahing pagbabago, hindi ang may-akda ng patch sa ilalim ng presyon.

Iyan ang labor model na binuo ng Triggerfish: mga tao na nagre-review at nag-a-approve ng gawa ng agent sa halip na isinasagawa ang trabahong kaya ng mga agent. Tumataas ang automation coverage habang bumababa ang maintenance burden, at ang team na gumagastos ng 75 porsiyento ng kanilang oras sa pagpapanatili ay maaaring i-redirect ang karamihan ng oras na iyon sa mga bagay na talagang nangangailangan ng paghatol ng tao.

## Available Na Ngayon

Naipapadala na ngayon ang mga self-healing workflow bilang isang opsyonal na feature sa Triggerfish workflow engine. Opt-in ito sa bawat workflow, nako-configure sa workflow metadata block. Kung hindi mo ito na-enable, walang magbabago sa kung paano tumatakbo ang iyong mga workflow.

Mahalaga ito hindi dahil ito ay isang mahirap na teknikal na problema (bagaman ganoon nga), kundi dahil direktang tinutugunan nito ang bagay na nagpapagastos at nagpapahirap sa enterprise automation nang higit sa nararapat. Ang workflow maintenance team ang dapat na unang trabahong kunin ng AI automation. Iyan ang tamang paggamit ng teknolohiyang ito, at iyan ang itinayo ng Triggerfish.

Kung gusto mong suriin kung paano ito gumagana, ang buong spec ay nasa repository. Kung gusto mong subukan, gagabayan ka ng workflow-builder skill sa pagsulat ng iyong unang self-healing workflow.
