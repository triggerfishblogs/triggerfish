---
title: AI Inference sa mga Production Workflow
description: Paano tinutuklap ng Triggerfish ang agwat sa pagitan ng mga AI demo at matibay na mga workflow sa produksyon na may pagpapatupad ng seguridad, mga audit trail, at orchestration ng workflow.
---

# AI/ML Inference Integration sa mga Production Workflow

Karamihan sa mga proyektong AI sa enterprise ay namamatay sa agwat sa pagitan ng demo at produksyon. Ang isang pangkat ay nagtatayo ng isang proof of concept na gumagamit ng GPT-4 para mag-classify ng mga tiket ng suporta o mag-summarize ng mga legal na dokumento o mag-generate ng marketing copy. Gumagana ang demo. Nasasabik ang pamunuan. Pagkatapos ang proyekto ay humihinto sa loob ng mga buwan na sinusubukang sagutin ang mga tanong na hindi kailanman kailangang sagutin ng demo: Saan nagmumula ang data? Saan napupunta ang output? Sino ang nagpa-apruba sa mga desisyon ng AI? Ano ang nangyayari kapag na-hallucinate ang modelo? Paano natin mai-audit ang ginawa nito? Paano natin pipigilan ang pag-access nito sa data na hindi nito dapat makita? Paano natin pipigilan ang pagpapadala nito ng sensitibong impormasyon sa maling lugar?

Hindi ito mga hypothetical na alalahanin. 95% ng mga enterprise generative AI pilot ay nabigo na makapagbigay ng pinansiyal na kita, at ang dahilan ay hindi dahil hindi gumagana ang teknolohiya. Kayang-kaya ng mga modelo. Ang pagkabigo ay nasa plumbing: ang maaasahang pag-integrate ng AI inference sa mga aktwal na workflow ng negosyo kung saan ito kailangang mag-operate, na may mga kontrol sa seguridad, pangangasiwa ng error, at mga audit trail na kailangan ng mga sistema sa produksyon.

Ang tipikal na tugon ng enterprise ay ang bumuo ng isang custom na layer ng integration. Ang isang pangkat ng inhinyero ay gumagugol ng mga buwan na nagkokonekta ng AI modelo sa mga pinagkukunan ng data, nagtatayo ng pipeline, nagdadagdag ng authentication, nagpapatupad ng logging, lumilikha ng workflow ng pag-apruba, at nagdinadagdag ng mga tseke sa seguridad. Sa oras na ang integration ay "handa sa produksyon," ang orihinal na modelo ay napalitan na ng mas bagong modelo, ang mga kinakailangan ng negosyo ay nagbago, at ang pangkat ay kailangang magsimula muli.

## Paano Nilulutas ng Triggerfish Ito

Inaalis ng Triggerfish ang agwat ng integration sa pamamagitan ng paggawa ng AI inference bilang isang first-class na hakbang sa workflow engine, pinamamahalaan ng parehong pagpapatupad ng seguridad, pag-log ng audit, at mga kontrol sa classification na nalalapat sa bawat iba pang operasyon sa sistema. Ang isang hakbang ng LLM sub-agent sa isang Triggerfish workflow ay hindi isang dagdag-dagdag. Ito ay isang native na operasyon na may parehong mga hook ng patakaran, pagsubaybay ng lineage, at pag-iwas sa write-down tulad ng isang HTTP call o isang query sa database.

### AI bilang isang Hakbang ng Workflow, Hindi isang Hiwalay na Sistema

Sa workflow DSL, ang isang hakbang ng LLM inference ay tinukoy gamit ang `call: triggerfish:llm`. Sinasabi ng paglalarawan ng gawain sa sub-agent kung ano ang gagawin sa natural na wika. Ang sub-agent ay may access sa bawat tool na nakarehistro sa Triggerfish. Makakahanap ito sa web, makakaquery ng mga database sa pamamagitan ng mga tool ng MCP, makakabasa ng mga dokumento, makaka-browse ng mga website, at makakagamit ng cross-session memory. Kapag natapos ang hakbang, ang output nito ay direktang pumapasok sa susunod na hakbang ng workflow.

Nangangahulugang walang hiwalay na "sistema ng AI" na ie-integrate. Ang inference ay nagaganap sa loob ng workflow, gamit ang parehong mga kredensyal, parehong mga koneksyon ng data, at parehong pagpapatupad ng seguridad tulad ng lahat ng iba pa. Ang isang pangkat ng inhinyero ay hindi kailangang bumuo ng isang custom na layer ng integration dahil ang layer ng integration ay mayroon na.

### Seguridad na Hindi Nangangailangan ng Custom na Inhinyerya

Ang pinaka-nakakaubos ng oras na bahagi ng pag-productionize ng isang AI workflow ay hindi ang AI. Ito ay ang trabaho sa seguridad at pagsunod. Aling data ang makikita ng modelo? Saan nito maipapadala ang output nito? Paano natin pipigilan ang pag-leak nito ng sensitibong impormasyon? Paano natin ilo-log ang lahat para sa audit?

Sa Triggerfish, ang mga tanong na ito ay sinasagot ng arkitektura ng platform, hindi ng bawat proyektong inhinyerya. Sinusubaybayan ng sistema ng classification ang sensitivity ng data sa bawat hangganan. Ang taint ng session ay nagiging mas mataas kapag nag-access ang modelo ng classified na data. Ang pag-iwas sa write-down ay nag-ba-block ng output mula sa pag-agos sa isang channel na na-classify sa ibaba ng antas ng taint ng session. Ang bawat tool call, bawat pag-access ng data, at bawat desisyon sa output ay nilo-log na may buong lineage.

Ang isang AI workflow na nagbabasa ng mga rekord ng customer (CONFIDENTIAL) at gumagawa ng isang buod ay hindi maaaring magpadala ng buod na iyon sa isang pampublikong Slack channel. Hindi ito ipinapatupad ng isang instruction na prompt na maaaring balewalain ng modelo. Ito ay ipinapatupad ng deterministikong code sa PRE_OUTPUT hook na hindi makikita ng modelo, hindi maaaring baguhin, at hindi maaaring lampasan. Ang mga hook ng patakaran ay tumatakbo sa ibaba ng LLM layer. Ang LLM ay humihiling ng isang aksyon, at nagpapasya ang layer ng patakaran kung papayagan ito. Ang timeout ay katumbas ng pagtanggi. Walang landas mula sa modelo patungo sa labas ng mundo na hindi dumadaan sa pagpapatupad.

### Mga Audit Trail na Mayroon Na

Ang bawat desisyon ng AI sa isang Triggerfish workflow ay awtomatikong gumagawa ng mga rekord ng lineage. Sinusubaybayan ng lineage kung anong data ang na-access ng modelo, kung anong antas ng classification ang dala nito, kung anong mga transformation ang inilapat, at kung saan napadala ang output. Hindi ito isang feature ng logging na kailangang paganahin o i-configure. Ito ay isang istrukturang katangian ng platform. Ang bawat elemento ng data ay nagdadala ng metadata ng provenance mula sa paglikha sa bawat transformation hanggang sa huling destinasyon nito.

Para sa mga regulated na industriya, nangangahulugang ang ebidensya ng pagsunod para sa isang AI workflow ay umiiral mula sa unang araw. Ang isang auditor ay maaaring subaybayan ang anumang AI-generated na output pabalik sa kumpletong chain: kung aling modelo ang gumawa nito, kung anong data ang batay nito, kung anong mga tool ang ginamit ng modelo sa panahon ng pangangatwiran, kung anong antas ng classification ang inilapat sa bawat hakbang, at kung nagkaroon ng anumang aksyon ng pagpapatupad ng patakaran. Ang koleksyon ng ebidensyang ito ay nagaganap awtomatiko dahil ito ay itinayo sa mga hook ng pagpapatupad, hindi idinadagdag bilang isang layer ng pag-uulat.

### Kakayahang Umangkop ng Modelo Nang Walang Re-Architecture

Sinusuportahan ng Triggerfish ang maraming LLM provider sa pamamagitan ng interface ng LlmProvider: Anthropic, OpenAI, Google, mga lokal na modelo sa pamamagitan ng Ollama, at OpenRouter para sa anumang routed na modelo. Ang pagpili ng provider ay bawat agent na maaaring i-configure na may awtomatikong failover. Kapag may available na mas magandang modelo o nagbago ang pagpepresyo ng isang provider, ang pagbabago ay nagaganap sa antas ng configuration nang hindi hinahawakan ang mga depinisyon ng workflow.

Direktang tinutugunan nito ang problema ng "ang proyekto ay lipas na bago ito mailunsad." Ang mga depinisyon ng workflow ay naglalarawan kung ano ang gagawin ng AI, hindi kung aling modelo ang gagawa nito. Ang paglipat mula sa GPT-4 patungo sa Claude patungo sa isang fine-tuned na lokal na modelo ay nagbabago ng isang halaga ng configuration. Ang workflow, ang mga kontrol sa seguridad, ang mga audit trail, at ang mga punto ng integration ay nananatiling eksaktong pareho.

### Cron, Webhooks, at Event-Driven na Pagpapatupad

Ang mga AI workflow na tumatakbo sa iskedyul o bilang tugon sa mga event ay hindi nangangailangan ng isang tao para mag-prompt sa kanila. Sinusuportahan ng scheduler ang limang-field na mga expression ng cron para sa mga paulit-ulit na workflow at mga endpoint ng webhook para sa mga event-driven na trigger. Ang isang pang-araw-araw na workflow ng pagbuo ng ulat ay tumatakbo sa 6am. Ang isang workflow ng pag-classify ng dokumento ay sumusunog kapag may bagong file na dumating sa pamamagitan ng webhook. Ang isang workflow ng sentiment analysis ay nag-ti-trigger sa bawat bagong tiket ng suporta.

Ang bawat naka-schedule o event-triggered na pagpapatupad ay naglu-launch ng isang isolated na session na may sariwang taint. Ang workflow ay tumatakbo sa sariling konteksto ng seguridad nito, malaya mula sa anumang interactive na session. Kung ang cron-triggered na workflow ay nag-access ng CONFIDENTIAL na data, ang kasaysayan ng pagpapatupad na iyon lamang ang na-classify sa CONFIDENTIAL. Ang ibang mga naka-schedule na workflow na tumatakbo sa PUBLIC na classification ay hindi apektado.

### Pangangasiwa ng Error at Human-in-the-Loop

Ang mga production AI workflow ay kailangang makaharap ng pagkabigo nang maayos. Sinusuportahan ng workflow DSL ang `raise` para sa mga tahasang kondisyon ng error at mga semantika ng try/catch sa pamamagitan ng pangangasiwa ng error sa mga depinisyon ng gawain. Kapag ang isang LLM sub-agent ay gumagawa ng output na may mababang kumpiyansa o nakatagpo ng sitwasyon na hindi nito kaya, maaaring i-route ng workflow ang isang pila ng pag-apruba ng tao, magpadala ng isang notipikasyon sa pamamagitan ng serbisyo ng notipikasyon, o gumawa ng fallback na aksyon.

Ang serbisyo ng notipikasyon ay naghahatid ng mga alerto sa lahat ng konektadong channel na may priyoridad at deduplication. Kung ang isang workflow ay nangangailangan ng pag-apruba ng tao bago maipadala ang isang AI-generated na pagbabago ng kontrata, ang kahilingan ng pag-apruba ay maaaring dumating sa Slack, WhatsApp, email, o saan man naroroon ang approver. Ang workflow ay humihinto hanggang makarating ang pag-apruba, pagkatapos ay nagpapatuloy mula sa tinitigil nito.

## Ano ang Hitsura Nito sa Pagsasanay

Nais ng isang departamento ng legal na i-automate ang pagsusuri ng kontrata. Ang tradisyonal na diskarte: anim na buwan ng custom na pag-develop para bumuo ng isang pipeline na nag-e-extract ng mga sugnay mula sa mga na-upload na kontrata, nag-u-ururi ng mga antas ng panganib, nagfla-flag ng mga hindi pamantayang tuntunin, at gumagawa ng buod para sa abogadong nagsusuri. Ang proyekto ay nangangailangan ng isang dedicated na pangkat ng inhinyero, isang custom na pagsusuri ng seguridad, isang sign-off ng pagsunod, at patuloy na pagpapanatili.

Sa Triggerfish, ang depinisyon ng workflow ay tumatagal ng isang araw para isulat. Ang pag-upload ay nagti-trigger ng webhook. Ang isang LLM sub-agent ay nagbabasa ng kontrata, nag-e-extract ng mga pangunahing sugnay, nag-u-ururi ng mga antas ng panganib, at nagkilala ng mga hindi pamantayang tuntunin. Ang isang hakbang ng validation ay sinusuri ang pag-extract laban sa library ng sugnay ng kumpanya na nakaimbak sa memory. Ang buod ay niruruta sa notification channel ng abogadong nakatakda. Ang buong pipeline ay tumatakbo sa antas ng RESTRICTED na classification dahil ang mga kontrata ay naglalaman ng pribilehiyong impormasyon ng kliyente, at tinitiyak ng pag-iwas sa write-down na walang data ng kontrata ang lumalabas sa isang channel sa ibaba ng RESTRICTED.

Kapag ang kumpanya ay lumipat ng mga LLM provider (dahil ang isang bagong modelo ay mas mahusay sa pangangasiwa ng legal na wika, o dahil ang kasalukuyang provider ay nagpataas ng presyo), ang pagbabago ay isang linya sa configuration. Ang depinisyon ng workflow, ang mga kontrol sa seguridad, ang audit trail, at ang routing ng notipikasyon ay patuloy na gumagana nang wala ang pagbabago. Kapag nagdagdag ang kumpanya ng bagong uri ng sugnay sa kanilang balangkas ng panganib, kinukuha ito ng LLM sub-agent nang walang muling pagsulat ng mga panuntunan ng pag-extract dahil nagbabasa ito para sa kahulugan, hindi sa mga pattern.

Ang pangkat ng pagsunod ay nakakakuha ng kumpletong audit trail mula sa unang araw. Ang bawat kontratang naproseso, bawat sugnay na na-extract, bawat klasipikasyon ng panganib na itinalaga, bawat notipikasyon na napadala, at bawat pag-apruba ng abogado na naitala, na may buong lineage pabalik sa source na dokumento. Ang koleksyon ng ebidensya na kukuha ng mga linggo ng custom na trabaho sa pag-uulat ay awtomatikong umiiral bilang isang istrukturang katangian ng platform.
