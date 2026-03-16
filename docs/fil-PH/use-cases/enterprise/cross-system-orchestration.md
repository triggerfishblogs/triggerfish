---
title: Cross-System Orchestration
description: Paano hinahawakan ng Triggerfish ang mga workflow na sumasaklaw sa 12+ na sistema na may mga pagpapasyang nangangailangan ng kontekstwal na hatol sa bawat hakbang, nang wala ang kahinaang pumapatay sa tradisyonal na automation.
---

# Cross-System Orchestration na may mga Hatol na Pagpapasya

Ang isang tipikal na procure-to-pay na workflow ay sumasaklaw sa isang dosena na sistema. Nagsisimula ang isang kahilingan sa pagbili sa isang platform, niruruta sa isang approval chain sa isa pa, nagti-trigger ng paghahanap ng vendor sa ikatlo, lumilikha ng purchase order sa ikaapat, nagsisimula ng proseso ng pagtanggap sa ikalima, nagtatugma ng mga invoice sa ikaanim, nag-i-schedule ng pagbabayad sa ikapito, at nagtatala ng lahat sa ikawalo. Ang bawat sistema ay may sariling API, sariling iskedyul ng pag-update, sariling modelo ng authentication, at sariling mga paraan ng pagkabigo.

Hinahawakan ng tradisyonal na automation ito gamit ang mahigpit na mga pipeline. Ang hakbang isa ay tumatawag sa API A, nini-parse ang tugon, nagpapasa ng isang field sa hakbang dalawa, na tumatawag sa API B. Gumagana ito hanggang hindi na. Ang isang rekord ng vendor ay may bahagyang naiibang format kaysa inaasahan. Ang isang approval ay bumabalik na may status code na hindi dinisenyo ang pipeline para dito. Lumabas ang isang bagong kinakailangang field sa isang pag-update ng API. Ang isang sirang hakbang ay sinisira ang buong chain, at walang nakakaalam hanggang mabigo ang isang downstream na proseso mga araw na ang lumipas.

Ang mas malalim na problema ay hindi teknikal na kahinaan. Ito ay ang mga tunay na proseso ng negosyo ay nangangailangan ng hatol. Dapat bang i-escalate o awtomatikong resolbahin ang pagkakaiba ng invoice na ito? Ang huli na pattern ng paghahatid ng vendor na ito ba ay nangangailangan ng pagsusuri ng kontrata? Ang kahilingang pag-apruba na ito ba ay sapat na urgent upang laktawan ang karaniwang routing? Ang mga desisyong ito ay kasalukuyang nasa ulo ng mga tao, na nangangahulugang ang automation ay makakahawak lamang sa masayang landas.

## Paano Nilulutas ng Triggerfish Ito

Ang workflow engine ng Triggerfish ay nag-eeksekuta ng mga YAML-based na depinisyon ng workflow na naghahalo ng deterministikong automation sa AI na pangangatwiran sa iisang pipeline. Ang bawat hakbang sa workflow ay dumadaan sa parehong layer ng pagpapatupad ng seguridad na namamahala sa lahat ng operasyon ng Triggerfish, kaya ang pagsubaybay ng classification at mga audit trail ay nananatili sa buong chain kahilangan ng gaano karaming sistema ang kasangkot.

### Mga Deterministikong Hakbang para sa Deterministikong Trabaho

Kapag ang isang hakbang ng workflow ay may kilalang input at kilalang output, ito ay tumatakbo bilang isang karaniwang HTTP call, shell command, o MCP tool invocation. Walang LLM na kasangkot, walang parusa sa latency, walang gastos sa inference. Sinusuportahan ng workflow engine ang `call: http` para sa mga REST API, `call: triggerfish:mcp` para sa anumang konektadong MCP server, at `run: shell` para sa mga command-line na tool. Ang mga hakbang na ito ay nag-eeksekuta nang eksaktong tulad ng tradisyonal na automation, dahil para sa mahuhulaan na trabaho, ang tradisyonal na automation ay ang tamang diskarte.

### Mga LLM Sub-Agent para sa mga Hatol na Pagpapasya

Kapag ang isang hakbang ng workflow ay nangangailangan ng kontekstwal na pangangatwiran, ang engine ay naglu-launch ng isang tunay na LLM sub-agent session gamit ang `call: triggerfish:llm`. Hindi ito isang solong prompt/tugon. Ang sub-agent ay may access sa bawat tool na nakarehistro sa Triggerfish, kabilang ang web search, memory, browser automation, at lahat ng konektadong integration. Makakabasa ito ng mga dokumento, makakaquery ng mga database, makakapagtugma ng mga rekord, at makakagawa ng desisyon batay sa lahat ng natuklasan nito.

Ang output ng sub-agent ay direktang pumapasok sa susunod na hakbang ng workflow. Kung na-access nito ang classified na data sa panahon ng pangangatwiran nito, ang taint ng session ay awtomatikong nagiging mas mataas at nagpapalaganap pabalik sa parent na workflow. Sinusubaybayan ito ng workflow engine, kaya ang isang workflow na nagsimula sa PUBLIC ngunit humawak ng CONFIDENTIAL na data sa panahon ng isang hatol na pagpapasya ay iniimbak ang buong kasaysayan ng pagpapatupad nito sa antas ng CONFIDENTIAL. Ang isang session na may mas mababang classification ay hindi maaaring makita kahit na lumabas ang workflow.

### Kondisyonal na Branching Batay sa Tunay na Konteksto

Sinusuportahan ng workflow DSL ang mga `switch` na bloke para sa kondisyonal na routing, `for` na mga loop para sa batch na pagproseso, at `set` na mga operasyon para sa pag-update ng estado ng workflow. Kasama ang mga hakbang ng LLM sub-agent na makakapag-evaluate ng mga kumplikadong kondisyon, nangangahulugang ang workflow ay maaaring mag-branch batay sa aktwal na konteksto ng negosyo sa halip na mga halaga ng field lamang.

Ang isang procurement workflow ay maaaring mag-route nang naiiba batay sa pagtatasa ng sub-agent sa panganib ng vendor. Ang isang onboarding workflow ay maaaring laktawan ang mga hakbang na hindi relevant para sa isang partikular na papel. Ang isang incident response workflow ay maaaring mag-escalate sa iba't ibang team batay sa pagsusuri ng root cause ng sub-agent. Ang lohika ng branching ay nasa depinisyon ng workflow, ngunit ang mga input ng desisyon ay nagmumula sa AI na pangangatwiran.

### Sariling-Paggaling Kapag Nagbago ang mga Sistema

Kapag ang isang deterministikong hakbang ay nabigo dahil nagbago ang format ng tugon ng isang API o nagbalik ng hindi inaasahang error ang isang sistema, ang workflow ay hindi basta humihinto. Maaaring i-delegate ng engine ang nabaong hakbang sa isang LLM sub-agent na nagbabasa ng error, sinisiyasat ang tugon, at nagtatangkang gumamit ng alternatibong diskarte. Ang isang API na nagdagdag ng bagong kinakailangang field ay hinahawakan ng sub-agent na binabasa ang mensahe ng error at inaayos ang kahilingan. Ang isang sistema na nagbago ng daloy ng authentication nito ay nini-navigate ng mga tool ng browser automation.

Hindi nangangahulugang awtomatikong nalulutas ang bawat pagkabigo. Ngunit nangangahulugang ang workflow ay nagde-degrade nang maayos sa halip na bigo nang walang abiso. Ang sub-agent ay naghahanap ng landas pasulong o nagbibigay ng malinaw na paliwanag kung ano ang nagbago at bakit kailangan ng manu-manong interbensyon, sa halip na isang cryptic na code ng error na nailibing sa isang log file na walang nagtatanaw.

### Seguridad sa Buong Chain

Ang bawat hakbang sa isang Triggerfish workflow ay dumadaan sa parehong mga hook ng pagpapatupad ng patakaran tulad ng anumang direktang tool call. Bino-validate ng PRE_TOOL_CALL ang mga pahintulot at sinusuri ang mga limitasyon ng rate bago ang pagpapatupad. Inuuri ng POST_TOOL_RESPONSE ang ibinalik na data at ina-update ang taint ng session. Tinitiyak ng PRE_OUTPUT na walang umaalis sa sistema sa antas ng classification na mas mataas kaysa pinapayagan ng target.

Nangangahulugang ang isang workflow na nagbabasa mula sa inyong CRM (CONFIDENTIAL), nagpoproseso ng data sa pamamagitan ng isang LLM, at nagpapadala ng buod sa Slack ay hindi nagtatanggal ng mga kumpidensyal na detalye sa isang pampublikong channel. Nahuhuli ito ng patakaran ng pag-iwas sa write-down sa PRE_OUTPUT hook, anuman ang bilang ng mga intermediate na hakbang na pinagdaanan ng data. Ang classification ay sumasamahan sa data sa buong workflow.

Ang mismong depinisyon ng workflow ay maaaring magtakda ng `classification_ceiling` na pumipigil sa workflow na huwag humawak ng data na mas mataas sa isang tinukoy na antas. Ang isang lingguhang buod ng workflow na na-classify sa INTERNAL ay hindi maaaring ma-access ang CONFIDENTIAL na data kahit na mayroon itong mga kredensyal para gawin ito. Ang kisame ay ipinapatupad sa code, hindi sa pag-asa na susundin ng LLM ang isang instruction na prompt.

### Mga Trigger na Cron at Webhook

Hindi nangangailangan ng taong mano-manong magsimula ng mga workflow. Sinusuportahan ng scheduler ang mga trigger na nakabatay sa cron para sa mga paulit-ulit na workflow at mga webhook trigger para sa event-driven na pagpapatupad. Ang isang workflow ng umaga na briefing ay tumatakbo sa 7am. Ang isang workflow ng PR review ay nagbubunyag kapag nagpadala ng webhook ang GitHub. Ang isang workflow ng pagproseso ng invoice ay nag-ti-trigger kapag lumabas ang isang bagong file sa isang shared drive.

Ang mga webhook event ay nagdadala ng sarili nilang antas ng classification. Ang isang GitHub webhook para sa isang pribadong repository ay awtomatikong na-classify sa CONFIDENTIAL batay sa mga mapping ng classification ng domain sa config ng seguridad. Ang workflow ay nagmamana ng classification na iyon at lahat ng downstream na pagpapatupad ay nalalapat.

## Ano ang Hitsura Nito sa Pagsasanay

Ang isang mid-market na kumpanya na nagpapatakbo ng procure-to-pay sa NetSuite, Coupa, DocuSign, at Slack ay nagde-define ng isang Triggerfish workflow na humahawak sa buong ikot. Ang mga deterministikong hakbang ay humahawak sa mga API call para lumikha ng mga purchase order, mag-route ng mga pag-apruba, at magtugma ng mga invoice. Ang mga hakbang ng LLM sub-agent ay humahawak sa mga eksepsyon: mga invoice na may mga linya ng item na hindi tumutugma sa PO, mga vendor na nagsumite ng dokumentasyon sa hindi inaasahang format, mga kahilingan sa pag-apruba na nangangailangan ng konteksto tungkol sa kasaysayan ng nag-request.

Ang workflow ay tumatakbo sa isang self-hosted na instance ng Triggerfish. Walang data na lumalabas sa imprastraktura ng kumpanya. Tinitiyak ng sistema ng classification na ang financial na data mula sa NetSuite ay nananatili sa CONFIDENTIAL at hindi maaaring maipadala sa isang Slack channel na na-classify sa INTERNAL. Kinukuha ng audit trail ang bawat desisyon na ginawa ng LLM sub-agent, bawat tool na tinawagan nito, at bawat piraso ng data na na-access nito, na nakaimbak na may buong lineage tracking para sa pagsusuri ng pagsunod.

Kapag ang Coupa ay nag-update ng kanilang API at nagbago ng pangalan ng field, nabigo ang deterministikong HTTP na hakbang ng workflow. Ini-delegate ng engine sa isang sub-agent na nagbabasa ng error, kinilala ang nagbagong field, at nagre-retry na may tamang parameter. Nakumpleto ng workflow nang wala ang interbensyon ng tao, at ang insidente ay nalo-log upang ang isang inhinyero ay maaaring mag-update ng depinisyon ng workflow upang mahawakan ang bagong format sa hinaharap.
