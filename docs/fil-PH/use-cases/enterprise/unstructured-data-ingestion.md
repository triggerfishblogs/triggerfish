---
title: Unstructured Data Ingestion
description: Paano hinahawakan ng Triggerfish ang pagproseso ng invoice, pagtanggap ng dokumento, at pag-parse ng email nang hindi nasisira kapag nagbago ang mga format ng input.
---

# Pag-ingest ng Hindi Nakaayos at Semi-Nakaayos na Data

Ang pagproseso ng invoice ay dapat na nalutas na sa ngayon. Dumarating ang isang dokumento, nini-extract ang mga field, bino-validate ang data laban sa mga umiiral na rekord, at niruruta ang resulta sa tamang sistema. Ang katotohanan ay ang pagproseso ng invoice lamang ay nagkakahalaga ng bilyon-bilyong dolyar sa manwal na paggawa ng mga enterprise bawat taon, at ang mga proyektong automation na sinadyang ayusin ito ay patuloy na nasisira.

Ang dahilan ay pagkakaiba ng format. Dumarating ang mga invoice bilang mga PDF, attachment ng email, na-scan na mga imahe, mga export ng spreadsheet, at paminsan-minsang fax. Gumagamit ang bawat vendor ng iba't ibang layout. Ang mga linya ng item ay lumalabas sa mga talahanayan, sa free text, o sa kumbinasyon ng dalawa. Ang mga kalkulasyon ng buwis ay sumusunod sa iba't ibang panuntunan ayon sa jurisdiksyon. Nagbabago ang mga format ng pera. Nagbabago ang mga format ng petsa. Kahit ang parehong vendor ay nagbabago ng kanilang template ng invoice nang walang abiso.

Hinahawakan ng tradisyonal na RPA ito gamit ang template matching. Tukuyin ang mga koordinada kung saan lumalabas ang numero ng invoice, kung saan nagsisimula ang mga linya ng item, kung saan naroroon ang kabuuan. Gumagana ito para sa isang template ng kasalukuyang vendor. Pagkatapos ay nag-update ang vendor ng kanilang sistema, inilipat ang isang column, nagdagdag ng header row, o nagbago ng kanilang PDF generator, at ang bot ay nabigo nang buo o nag-e-extract ng basurang data na nagpapalaganap sa downstream hanggang sa manualmente itong mahuli ng isang tao.

Ang parehong pattern ay paulit-ulit sa bawat hindi nakaayos na workflow ng data. Nasisira ang pagproseso ng insurance EOB kapag nagbago ang isang payer ng kanilang layout ng form. Nasisira ang pagtanggap ng prior authorization kapag may bagong uri ng dokumento na idinagdag sa proseso. Nasisira ang pag-parse ng email ng customer kapag may gumamit ng bahagyang naiibang format ng linya ng paksa. Ang gastos sa pagpapanatili ng mga automation na ito ay madalas na lumagpas sa gastos ng paggawa ng trabaho nang manu-mano.

## Paano Nilulutas ng Triggerfish Ito

Pinapalitan ng Triggerfish ang positional field extraction ng LLM-based na pag-unawa sa dokumento. Binabasa ng AI ang dokumento sa paraan ng isang tao: pag-unawa sa konteksto, paghihinuha ng mga relasyon sa pagitan ng mga field, at awtomatikong pag-a-adapt sa mga pagbabago ng layout. Kasama ang workflow engine para sa pipeline orchestration at ang sistema ng classification para sa seguridad ng data, lumilikha ito ng mga pipeline ng pag-ingest na hindi nasisira kapag nagbago ang mundo.

### LLM-Powered na Pag-parse ng Dokumento

Kapag ang isang dokumento ay pumapasok sa isang Triggerfish workflow, ang isang LLM sub-agent ay nagbabasa ng buong dokumento at nag-e-extract ng nakaayos na data batay sa ibig sabihin ng dokumento, hindi kung saan naroroon ang mga partikular na pixel. Ang isang numero ng invoice ay isang numero ng invoice kahit ito ay nasa kanang sulok sa itaas na may label na "Invoice #" o sa gitna ng pahina na may label na "Factura No." o nakasama sa isang talata ng teksto. Naiintindihan ng LLM na ang "Net 30" ay nangangahulugang mga tuntunin ng pagbabayad, na ang "Qty" at "Quantity" at "Units" ay nangangahulugang pareho, at na ang isang talahanayan na may mga column para sa paglalarawan, rate, at halaga ay isang listahan ng linya ng item anuman ang pagkakasunod-sunod ng column.

Hindi ito isang generic na "ipadala ang dokumento sa ChatGPT at umasa sa pinakamaganda" na diskarte. Ang depinisyon ng workflow ay nagtutukoy nang eksakto kung anong nakaayos na output ang dapat gawin ng LLM, kung anong mga panuntunan ng validation ang nalalapat, at kung ano ang mangyayari kapag ang kumpiyansa ng pag-extract ay mababa. Ang paglalarawan ng gawain ng sub-agent ay nagde-define ng inaasahang schema, at ang mga kasunod na hakbang ng workflow ay nino-validate ang na-extract na data laban sa mga panuntunan ng negosyo bago ito pumasok sa anumang downstream na sistema.

### Browser Automation para sa Pagkuha ng Dokumento

Maraming workflow ng pag-ingest ng dokumento ay nagsisimula sa pagkuha ng dokumento mismo. Ang mga insurance EOB ay nasa mga portal ng payer. Ang mga invoice ng vendor ay nasa mga platform ng supplier. Ang mga form ng pamahalaan ay nasa mga website ng state agency. Gumagamit ang tradisyonal na automation ng mga Selenium script o API call para makuha ang mga dokumentong ito, at ang mga script na iyon ay nasisira kapag nagbago ang portal.

Ang browser automation ng Triggerfish ay gumagamit ng CDP-controlled na Chromium na may LLM na nagbabasa ng mga snapshot ng pahina para mag-navigate. Ang agent ay nakikita ang pahina sa paraan ng isang tao at nagki-click, nagta-type, at nag-i-scroll batay sa nakikita nito sa halip na mga hardcoded na CSS selector. Kapag ang isang portal ng payer ay nagre-redesign ng kanilang pahina ng login, ang agent ay nag-a-adapt dahil makikilala pa rin nito ang field ng username, ang field ng password, at ang pindutang submit mula sa visual na konteksto. Kapag nagbago ang isang navigation menu, natutuklasan ng agent ang bagong landas patungo sa seksyon ng pag-download ng dokumento.

Hindi ito perpektong maaasahan. Ang mga CAPTCHA, multi-factor auth na daloy, at mga portal na lubos na umaasa sa JavaScript ay nagdudulot pa rin ng mga problema. Ngunit ang paraan ng pagkabigo ay pundamental na naiiba mula sa mga tradisyonal na script. Ang isang Selenium script ay bigo nang walang abiso kapag tumigil sa pagtutugma ang isang CSS selector. Iniuulat ng isang Triggerfish agent kung ano ang nakikita nito, kung ano ang sinubukan nito, at kung saan ito natigil, na nagbibigay sa operator ng sapat na konteksto para makapanghimasok o maadjust ang workflow.

### Classification-Gated na Pagproseso

Ang mga dokumento ay nagdadala ng iba't ibang antas ng sensitivity, at awtomatikong hinahawakan ito ng sistema ng classification. Ang isang invoice na naglalaman ng mga tuntunin ng pagpepresyo ay maaaring maging CONFIDENTIAL. Ang isang pampublikong tugon sa RFP ay maaaring maging INTERNAL. Ang isang dokumento na naglalaman ng PHI ay RESTRICTED. Kapag ang LLM sub-agent ay nagbabasa ng isang dokumento at nag-e-extract ng data, ang POST_TOOL_RESPONSE hook ay nag-u-uri ng na-extract na nilalaman, at ang taint ng session ay nagiging mas mataas nang naaayon.

Ito ay mahalaga para sa downstream na routing. Ang na-extract na data ng invoice na na-classify sa CONFIDENTIAL ay hindi maaaring maipadala sa isang Slack channel na na-classify sa PUBLIC. Ang isang workflow na nagpoproseso ng mga dokumento ng insurance na naglalaman ng PHI ay awtomatikong nagre-restrict kung saan maaaring dumaan ang na-extract na data. Ang patakaran ng pag-iwas sa write-down ay nagpapatupad nito sa bawat hangganan, at ang LLM ay walang awtoridad na i-override ito.

Para sa healthcare at financial services partikular, nangangahulugan ito na ang gastos sa pagsunod ng automated na pagproseso ng dokumento ay dramatikong bumababa. Sa halip na bumuo ng custom na mga kontrol sa access sa bawat hakbang ng bawat pipeline, ito ay pantay na hinahawakan ng sistema ng classification. Ang isang auditor ay maaaring subaybayan nang eksakto kung aling mga dokumento ang naproseso, kung anong data ang na-extract, kung saan ito napadala, at kumpirmahin na walang data na dumaan sa isang hindi angkop na destinasyon, lahat mula sa mga rekord ng lineage na awtomatikong nalilikha sa bawat hakbang.

### Sariling-Pagbabago ng Format para sa Pag-heal

Kapag ang isang vendor ay nagbago ng kanilang template ng invoice, ang tradisyonal na automation ay nasisira at nananatiling sira hanggang sa manu-manong i-update ng isang tao ang mga panuntunan ng pag-extract. Sa Triggerfish, ang LLM sub-agent ay nag-a-adapt sa susunod na takbo. Nakikilala pa rin nito ang numero ng invoice, ang mga linya ng item, at ang kabuuan, dahil nagbabasa ito para sa kahulugan sa halip na posisyon. Ang pag-extract ay nagtagumpay, ang data ay bino-validate laban sa parehong mga panuntunan ng negosyo, at natapos ang workflow.

Sa paglipas ng panahon, ang agent ay maaaring gumamit ng cross-session memory para matuto ng mga pattern. Kung ang vendor A ay palaging nagsasama ng restocking fee na hindi ginagawa ng ibang mga vendor, ang agent ay naaalala ito mula sa mga nakaraang pag-extract at alam na hanapin ito. Kung ang format ng EOB ng isang partikular na payer ay palaging naglalagay ng mga adjustment code sa isang hindi karaniwang lokasyon, ang memorya ng agent ng mga nakaraang matagumpay na pag-extract ay nagpapaganda ng mga hinaharap.

Kapag ang pagbabago ng format ay sapat na malaki upang bumaba ang kumpiyansa ng pag-extract ng LLM sa ibaba ng threshold na tinukoy sa workflow, ang workflow ay niruruta ang dokumento sa isang pila ng pagsusuri ng tao sa halip na hulaan. Ang mga pagwawasto ng tao ay pinapakain pabalik sa workflow, at ang memorya ng agent ay nag-iimbak ng bagong pattern para sa hinaharap na sanggunian. Ang sistema ay nagiging mas matalino sa paglipas ng panahon nang walang sinumang muling sumusulat ng mga panuntunan ng pag-extract.

### Pipeline Orchestration

Ang pag-ingest ng dokumento ay bihirang "i-extract at i-store" lamang. Ang isang kumpletong pipeline ay kukuha ng dokumento, mag-e-extract ng nakaayos na data, bino-validate ito laban sa mga umiiral na rekord, pinagyayaman ito ng data mula sa iba pang mga sistema, niruruta ang mga eksepsyon para sa pagsusuri ng tao, at ilo-load ang validated na data sa target na sistema. Ang workflow engine ay humahawak sa lahat ng ito sa iisang YAML na depinisyon.

Ang isang pipeline ng prior authorization sa healthcare ay maaaring magmukhang ganito: ang browser automation ay kumukuha ng imahe ng fax mula sa portal ng provider, ang isang LLM sub-agent ay nag-e-extract ng mga identifier ng pasyente at mga code ng pamamaraan, ang isang HTTP call ay nagva-validate ng pasyente laban sa EHR, ang isa pang sub-agent ay nagsusuri kung ang authorization ay natutugunan ang mga pamantayan ng medikal na pangangailangan batay sa clinical na dokumentasyon, at ang resulta ay niruruta alinman sa auto-approval o sa isang pila ng clinical reviewer. Ang bawat hakbang ay kinasusubaybayan ng classification. Ang bawat piraso ng PHI ay may taint-tag. Ang kumpletong audit trail ay awtomatikong umiiral.

## Ano ang Hitsura Nito sa Pagsasanay

Ang isang regional na sistema ng kalusugan ay nagpoproseso ng mga kahilingan sa prior authorization mula sa apatnapung iba't ibang opisina ng provider, bawat isa ay gumagamit ng sariling layout ng form, ilan ay faxed, ilan ay emailed, ilan ay ini-upload sa isang portal. Ang tradisyonal na diskarte ay nangangailangan ng isang pangkat ng walong tao para manu-manong suriin at ipasok ang bawat kahilingan, dahil walang tool ng automation ang maaasahang makakahandle ng pagkakaiba ng format.

Sa Triggerfish, ang isang workflow ay humahawak sa kumpletong pipeline. Ang browser automation o pag-parse ng email ay kumukuha ng mga dokumento. Ang mga LLM sub-agent ay nag-e-extract ng nakaayos na data anuman ang format. Ang mga hakbang ng validation ay sinusuri ang na-extract na data laban sa mga database ng EHR at formulary. Ang isang classification ceiling ng RESTRICTED ay tinitiyak na ang PHI ay hindi kailanman lumalabas sa hangganan ng pipeline. Ang mga dokumentong hindi ma-parse ng LLM nang may mataas na kumpiyansa ay niruruta sa isang human reviewer, ngunit ang bilang na iyon ay bumababa sa paglipas ng panahon habang ang memorya ng agent ay nagtatayo ng isang aklatan ng mga pattern ng format.

Ang pangkat ng walong tao ay nagiging dalawang tao na humahawak sa mga eksepsyon na may flag ang sistema, kasama ang mga pana-panahong quality audit ng mga automated na pag-extract. Ang mga pagbabago ng format mula sa mga opisina ng provider ay awtomatikong naaabsorb. Ang mga bagong layout ng form ay hinahawakan sa unang pagkakataon. Ang gastos sa pagpapanatili na gumamit ng karamihan sa budget ng tradisyonal na automation ay halos babagsak sa zero.
