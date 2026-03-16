---
title: Third-Party Portal Automation
description: Paano nag-a-automate ng Triggerfish ang mga interaksyon sa mga vendor portal, pamahalaan na mga site, at mga sistema ng payer nang hindi nasisira kapag nagbago ang UI.
---

# UI-Dependent na Automation Laban sa mga Third-Party Portal

Ang bawat enterprise ay may listahan ng mga portal na manu-manong pinagtatrabahuhan ng mga empleyado, araw-araw, para gawin ang trabahong dapat ay automated na ngunit hindi pa rin. Mga vendor portal para sa pagsusuri ng status ng order. Mga pamahalaan na site para sa pag-file ng mga regulatoryong submission. Mga portal ng insurance payer para sa pag-verify ng eligibility at pagsuri ng status ng claim. Mga board ng state licensing para sa pag-verify ng kredensyal. Mga portal ng awtoridad sa buwis para sa mga filing ng pagsunod.

Ang mga portal na ito ay walang mga API. O mayroon silang mga API na hindi dokumentado, may limitasyon sa rate, o limitado sa "mga piniling kasosyo" na nagbabayad para sa access. Ang data ay nandoon sa likod ng isang pahina ng login, na nire-render sa HTML, at ang tanging paraan para makuha ito ay ang mag-login at mag-navigate sa UI.

Gumagamit ang tradisyonal na automation ng mga script ng browser. Mga script ng Selenium, Playwright, o Puppeteer na naglo-login, nini-navigate sa tamang pahina, nahanap ang mga elemento sa pamamagitan ng CSS selector o XPath, ini-extract ang data, at naglo-logout. Ang mga script na ito ay gumagana hanggang hindi na. Ang isang redesign ng portal ay nagbabago ng mga pangalan ng CSS class. Ang isang bagong CAPTCHA ay idinagdag sa daloy ng login. Ang navigation menu ay lumipat mula sa isang sidebar patungo sa isang hamburger menu. Ang isang banner ng pahintulot sa cookie ay nagsimulang takpan ang pindutan ng submit. Ang script ay bigo nang walang abiso, at walang nakakaalam hanggang ang downstream na proseso na umaasa sa data ay nagsimulang mag-produce ng mga error.

Ang mga state medical board ay isang partikular na brutal na halimbawa. May limampung sa kanila, bawat isa ay may iba't ibang website, iba't ibang layout, iba't ibang paraan ng authentication, at iba't ibang mga format ng data. Nagre-redesign sila sa sarili nilang iskedyul nang walang abiso. Ang isang serbisyo ng pag-verify ng kredensyal na umaasa sa pag-scrape ng mga site na ito ay maaaring may lima o sampung sa limampung script na sira sa anumang oras, bawat isa ay nangangailangan ng isang developer na suriin ang bagong layout at isulat muli ang mga selector.

## Paano Nilulutas ng Triggerfish Ito

Pinagsasama ng browser automation ng Triggerfish ang CDP-controlled na Chromium sa LLM-based na visual na navigation. Nakikita ng agent ang pahina bilang mga nire-render na pixel at accessibility snapshot, hindi bilang isang DOM tree. Kinikikilala nito ang mga elemento sa pamamagitan ng hitsura nito at kung ano ang ginagawa nito, hindi sa pamamagitan ng mga pangalan ng CSS class. Kapag nagre-redesign ang isang portal, ang agent ay nag-a-adapt dahil ang mga form ng login ay mukhang mga form ng login pa rin, ang mga navigation menu ay mukhang mga navigation menu pa rin, at ang mga talahanayan ng data ay mukhang mga talahanayan ng data pa rin.

### Visual na Navigation sa halip na mga Script ng Selector

Ang mga tool ng browser automation ay gumagana sa pamamagitan ng pitong operasyon: navigate, snapshot, click, type, select, scroll, at wait. Ang agent ay nini-navigate sa isang URL, kumukuha ng isang snapshot ng nire-render na pahina, nagmamatwid kung ano ang nakikita nito, at nagpapasya kung anong aksyon ang gagawin. Walang `evaluate` na tool na nagpapatakbo ng arbitrary na JavaScript sa konteksto ng pahina. Ito ay isang sadyang desisyon sa seguridad. Nakikipag-interact ang agent sa pahina sa paraan ng isang tao — sa pamamagitan ng UI — at hindi maaaring mag-execute ng code na maaaring mapagsamantalahan ng isang malisyosong pahina.

Kapag nakatagpo ang agent ng isang form ng login, kinikikilala nito ang field ng username, ang field ng password, at ang pindutan ng submit batay sa visual na layout, placeholder na teksto, mga label, at istraktura ng pahina. Hindi kailangan nitong malaman na ang field ng username ay may `id="auth-input-email"` o `class="login-form__email-field"`. Kapag nagbago ang mga identifier na iyon sa isang redesign, hindi ito napapansin ng agent dahil hindi naman nito pinagkakatiwalaan ang mga ito.

### Nakabahaging Seguridad ng Domain

Ang browser navigation ay nagbabahagi ng parehong configuration ng seguridad ng domain tulad ng mga operasyon ng web fetch. Isang bloke ng config sa `triggerfish.yaml` ang nagde-define ng mga SSRF denylist, mga domain allowlist, mga domain denylist, at mga mapping ng domain-to-classification. Kapag ang agent ay nag-navigate sa isang vendor portal na na-classify sa CONFIDENTIAL, ang taint ng session ay awtomatikong nagiging CONFIDENTIAL, at lahat ng kasunod na aksyon sa workflow na iyon ay napapailalim sa mga paghihigpit ng antas ng CONFIDENTIAL.

Ang SSRF denylist ay hardcoded at hindi maaaring i-override. Ang mga pribadong hanay ng IP, mga link-local na address, at mga endpoint ng cloud metadata ay palaging naka-block. Ang resolution ng DNS ay sinusuri bago ang kahilingan, pinipigilan ang mga pag-atake ng DNS rebinding. Ito ay mahalaga dahil ang browser automation ay ang pinakamataas na panganib na attack surface sa anumang sistema ng agent. Ang isang malisyosong pahina na sumusubok na i-redirect ang agent sa isang panloob na serbisyo ay naka-block bago ang kahilingan ay lumabas sa sistema.

### Browser Profile Watermarking

Bawat agent ay nagpapanatili ng sariling profile ng browser, na nag-iipon ng mga cookie, local storage, at session data habang nakikipag-interact ito sa mga portal sa paglipas ng panahon. Ang profile ay nagdadala ng isang watermark ng classification na nagtatala ng pinakamataas na antas ng classification kung saan ito ginamit. Ang watermark na ito ay maaari lamang magiging mas mataas, hindi kailanman bababa.

Kung ang isang agent ay gumagamit ng profile ng browser nito para mag-login sa isang CONFIDENTIAL na vendor portal, ang profile ay na-watermark sa CONFIDENTIAL. Ang isang kasunod na session na tumatakbo sa PUBLIC classification ay hindi maaaring gumamit ng profile na iyon, pinipigilan ang pagtagas ng data sa pamamagitan ng mga naka-cache na kredensyal, cookie, o mga token ng session na maaaring naglalaman ng sensitibong impormasyon. Ang paghihiwalay ng profile ay bawat agent, at awtomatiko ang pagpapatupad ng watermark.

Nilulutas nito ang isang banayad ngunit mahalagang problema sa automation ng portal. Nag-iipon ng estado ang mga profile ng browser na sumasalamin sa data na na-access nila. Nang wala ang watermarking, ang isang profile na nag-login sa isang sensitibong portal ay maaaring mag-leak ng impormasyon sa pamamagitan ng mga mungkahi ng autocomplete, naka-cache na data ng pahina, o mga persistent na cookie sa isang mas mababang-classified na session.

### Pamamahala ng Kredensyal

Ang mga kredensyal ng portal ay iniimbak sa OS keychain (personal na tier) o enterprise vault (enterprise tier), hindi sa mga file ng configuration o mga variable ng kapaligiran. Ang SECRET_ACCESS hook ay naglo-log ng bawat pagkuha ng kredensyal. Ang mga kredensyal ay nire-resolve sa oras ng pagpapatupad ng workflow engine at ini-inject sa mga session ng browser sa pamamagitan ng interface ng pag-type, hindi sa pamamagitan ng pag-set ng mga halaga ng form nang programatiko. Nangangahulugang dumadaan ang mga kredensyal sa parehong layer ng seguridad tulad ng bawat iba pang sensitibong operasyon.

### Katatagan sa mga Karaniwang Pagbabago ng Portal

Narito ang nangyayari kapag naganap ang mga karaniwang pagbabago ng portal:

**Redesign ng pahina ng login.** Kumukuha ang agent ng bagong snapshot, kinikikilala ang na-update na layout, at naghahanap ng mga field ng form sa pamamagitan ng visual na konteksto. Maliban kung ang portal ay lumipat sa isang ganap na naiibang paraan ng authentication (SAML, OAuth, hardware token), ang login ay patuloy na gumagana nang wala ang anumang pagbabago sa configuration.

**Pagbabago ng istruktura ng navigation.** Binabasa ng agent ang pahina pagkatapos ng login at nini-navigate patungo sa target na seksyon batay sa teksto ng link, mga label ng menu, at mga heading ng pahina sa halip na mga pattern ng URL. Kung inilipat ng vendor portal ang "Order Status" mula sa kaliwang sidebar patungo sa isang top navigation dropdown, natutuklasan ito ng agent doon.

**Bagong banner ng pahintulot sa cookie.** Nakikita ng agent ang banner, kinikikilala ang pindutan ng tanggap/dismiss, nag-ki-click nito, at nagpapatuloy sa orihinal na gawain. Hinahawakan ito ng pangkalahatang pag-unawa sa pahina ng LLM, hindi ng isang espesyal na tagahawak ng cookie.

**Idinagdag na CAPTCHA.** Dito may mga tapat na limitasyon ang diskarte. Ang mga simpleng CAPTCHA ng imahe ay maaaring maaaring malutas depende sa mga kakayahan ng vision ng LLM, ngunit ang reCAPTCHA v3 at mga katulad na sistema ng pagsusuri ng gawi ay maaaring mag-block ng mga automated na browser. Ang workflow ay niruruta ang mga ito sa isang pila ng interbensyon ng tao sa halip na bigo nang walang abiso.

**Mga prompt ng multi-factor authentication.** Kung ang portal ay nagsimulang nangangailangan ng MFA na hindi dati kailangan, ang agent ay nakakakita ng hindi inaasahang pahina, iniuulat ang sitwasyon sa pamamagitan ng sistema ng notipikasyon, at inihihinto ang workflow hanggang makumpleto ng isang tao ang hakbang ng MFA. Maaaring i-configure ang workflow na maghintay para sa pagkumpleto ng MFA at pagkatapos ay magpatuloy mula sa tinitigil nito.

### Batch Processing sa Maraming Portal

Ang suporta ng workflow engine sa `for` loop ay nangangahulugang ang isang workflow ay maaaring mag-iterate sa maraming target ng portal. Ang isang serbisyo ng pag-verify ng kredensyal ay maaaring mag-define ng isang workflow na sinusuri ang katayuan ng lisensya sa lahat ng limampung state medical board sa isang batch run. Ang bawat interaksyon ng portal ay tumatakbo bilang isang hiwalay na sub-step na may sariling session ng browser, sariling pagsubaybay ng classification, at sariling pangangasiwa ng error. Kung tatlo sa limampung portal ang nabigo, kinukumpleto ng workflow ang iba pang apatnapu't pito at niruruta ang tatlong pagkabigo sa isang pila ng pagsusuri na may detalyadong konteksto ng error.

## Ano ang Hitsura Nito sa Pagsasanay

Ang isang organisasyon ng pag-verify ng kredensyal ay nagve-verify ng mga lisensya ng provider ng healthcare sa mga state medical board bilang bahagi ng proseso ng pag-enroll ng provider. Tradisyonal, ang mga assistant sa pag-verify ay manu-manong naglo-login sa website ng bawat board, naghahanap ng provider, kumukuha ng screenshot ng katayuan ng lisensya, at nagpapasok ng data sa sistema ng pag-verify ng kredensyal. Ang bawat pag-verify ay tumatagal ng lima hanggang labinlimang minuto, at ang organisasyon ay nagpoproseso ng daan-daang bawat linggo.

Sa Triggerfish, ang isang workflow ay humahawak sa buong ikot ng pag-verify. Ang workflow ay tumatanggap ng isang batch ng mga provider na may mga numero ng lisensya at mga target na estado. Para sa bawat provider, ang browser automation ay nini-navigate sa relevant na portal ng state board, naglo-login gamit ang mga nakaimbak na kredensyal, naghahanap ng provider, nini-extract ang katayuan ng lisensya at petsa ng pag-expire, at nag-iimbak ng resulta. Ang na-extract na data ay na-classify sa CONFIDENTIAL dahil naglalaman ito ng PII ng provider, at ang mga panuntunan ng write-down ay pumipigil sa pagpapadala nito sa anumang channel sa ibaba ng antas ng classification na iyon.

Kapag ang isang state board ay nagre-redesign ng kanilang portal, ang agent ay nag-a-adapt sa susunod na pagtatangka sa pag-verify. Kapag ang isang board ay nagdagdag ng CAPTCHA na nag-ba-block ng automated na access, ang workflow ay nagfa-flag ng estado na iyon para sa manu-manong pag-verify at nagpapatuloy sa pagproseso ng natitirang bahagi ng batch. Ang mga assistant sa pag-verify ay lumilipat mula sa manu-manong paggawa ng lahat ng pag-verify patungo sa pagharap lamang sa mga eksepsyon na hindi kaya resolbahin ng automation.
