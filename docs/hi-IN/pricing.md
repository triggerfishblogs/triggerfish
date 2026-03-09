---
title: मूल्य निर्धारण
---

<style>
.pricing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 24px;
  margin: 32px 0;
}

.pricing-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 32px 24px;
  background: var(--vp-c-bg-soft);
  display: flex;
  flex-direction: column;
}

.pricing-card.featured {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 1px var(--vp-c-brand-1);
}

.pricing-card h3 {
  margin: 0 0 8px;
  font-size: 22px;
}

.pricing-card .price {
  font-size: 36px;
  font-weight: 700;
  margin: 8px 0 4px;
}

.pricing-card .price span {
  font-size: 16px;
  font-weight: 400;
  color: var(--vp-c-text-2);
}

.pricing-card .subtitle {
  color: var(--vp-c-text-2);
  font-size: 14px;
  margin-bottom: 24px;
}

.pricing-card ul {
  list-style: none;
  padding: 0;
  margin: 0 0 24px;
  flex: 1;
}

.pricing-card ul li {
  padding: 6px 0;
  font-size: 14px;
  line-height: 1.5;
}

.pricing-card ul li::before {
  content: "\2713\00a0";
  color: var(--vp-c-brand-1);
  font-weight: 700;
}

.pricing-card ul li.excluded::before {
  content: "\2014\00a0";
  color: var(--vp-c-text-3);
}

.pricing-card .cta {
  display: block;
  text-align: center;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  text-decoration: none;
  margin-top: auto;
}

.pricing-card .cta.primary {
  background: #16a34a;
  color: var(--vp-c-white);
}

.pricing-card .cta.primary:hover {
  background: #15803d;
}

.pricing-card .cta.secondary {
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
}

.pricing-card .cta.secondary:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.comparison-table {
  width: 100%;
  border-collapse: collapse;
  margin: 32px 0;
  font-size: 14px;
}

.comparison-table th,
.comparison-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--vp-c-divider);
}

.comparison-table th {
  font-weight: 600;
  background: var(--vp-c-bg-soft);
}

.comparison-table td:not(:first-child) {
  text-align: center;
}

.comparison-table th:not(:first-child) {
  text-align: center;
}

.comparison-table .section-header {
  font-weight: 700;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
}

.faq-section h3 {
  margin-top: 32px;
}
</style>

# मूल्य निर्धारण

Triggerfish ओपन सोर्स है और हमेशा रहेगा। अपनी API कुंजियाँ लाएँ और सब कुछ
स्थानीय रूप से मुफ़्त में चलाएँ। Triggerfish Gateway एक प्रबंधित LLM बैकएंड, वेब
सर्च, टनल, और अपडेट जोड़ता है — ताकि आपको इनमें से कुछ भी प्रबंधित न करना पड़े।

::: info अर्ली एक्सेस
Triggerfish Gateway वर्तमान में अर्ली एक्सेस में है। उत्पाद को परिष्कृत करते समय
मूल्य निर्धारण और सुविधाएँ बदल सकती हैं। अर्ली एक्सेस सदस्य अपनी दर लॉक कर लेते हैं।
:::

<div class="pricing-grid">

<div class="pricing-card">
  <h3>ओपन सोर्स</h3>
  <div class="price">मुफ़्त</div>
  <div class="subtitle">हमेशा के लिए। Apache 2.0।</div>
  <ul>
    <li>पूर्ण एजेंट प्लेटफ़ॉर्म</li>
    <li>सभी चैनल (Telegram, Slack, Discord, WhatsApp, आदि)</li>
    <li>सभी इंटीग्रेशन (GitHub, Google, Obsidian, आदि)</li>
    <li>वर्गीकरण एवं नीति प्रवर्तन</li>
    <li>स्किल्स, plugin, cron, webhook</li>
    <li>ब्राउज़र ऑटोमेशन</li>
    <li>अपनी LLM कुंजियाँ लाएँ (Anthropic, OpenAI, Google, Ollama, आदि)</li>
    <li>अपनी सर्च कुंजियाँ लाएँ (Brave, SearXNG)</li>
    <li>स्वचालित अपडेट</li>
  </ul>
  <a href="/hi-IN/guide/installation" class="cta secondary">अभी इंस्टॉल करें</a>
</div>

<div class="pricing-card featured">
  <h3>Pro</h3>
  <div class="price">$49<span>/माह</span></div>
  <div class="subtitle">वह सब कुछ जो आपको चाहिए। API कुंजियाँ आवश्यक नहीं।</div>
  <ul>
    <li>ओपन सोर्स की सभी सुविधाएँ</li>
    <li>AI इंफ़रेंस शामिल — प्रबंधित LLM बैकएंड, API कुंजियों की ज़रूरत नहीं</li>
    <li>वेब सर्च शामिल</li>
    <li>webhook के लिए क्लाउड टनल</li>
    <li>शेड्यूल किए गए कार्य</li>
    <li>2 मिनट से कम में सेटअप</li>
  </ul>
  <a href="https://billing.trigger.fish/b/aFa14m9mobpH0vc4mlao800?locale=hi" class="cta primary">सदस्यता लें</a>
</div>

<div class="pricing-card">
  <h3>Power</h3>
  <div class="price">$199<span>/माह</span></div>
  <div class="subtitle">Pro से 5 गुना अधिक उपयोग। भारी कार्यभार के लिए।</div>
  <ul>
    <li>Pro की सभी सुविधाएँ</li>
    <li>AI इंफ़रेंस शामिल — उच्च उपयोग सीमाएँ</li>
    <li>एजेंट टीम — मल्टी-एजेंट सहयोग</li>
    <li>अधिक समवर्ती सत्र</li>
    <li>एकाधिक क्लाउड टनल</li>
    <li>असीमित शेड्यूल किए गए कार्य</li>
    <li>लंबे AI उत्तर</li>
    <li>प्राथमिकता समर्थन</li>
  </ul>
  <a href="https://billing.trigger.fish/b/5kQdR89mo2Tb4Lsg53ao802?locale=hi" class="cta primary">सदस्यता लें</a>
</div>

<div class="pricing-card">
  <h3>Enterprise</h3>
  <div class="price">कस्टम</div>
  <div class="subtitle">SSO और अनुपालन के साथ टीम परिनियोजन।</div>
  <ul>
    <li>Power की सभी सुविधाएँ</li>
    <li>बहु-सीट लाइसेंसिंग</li>
    <li>SSO / SAML इंटीग्रेशन</li>
    <li>कस्टम उपयोग सीमाएँ</li>
    <li>कस्टम मॉडल रूटिंग</li>
    <li>समर्पित समर्थन</li>
    <li>SLA गारंटी</li>
    <li>ऑन-प्रीमाइस परिनियोजन विकल्प</li>
  </ul>
  <a href="mailto:sales@trigger.fish" class="cta secondary">बिक्री से संपर्क करें</a>
</div>

</div>

## सुविधा तुलना

<table class="comparison-table">
<thead>
<tr>
  <th></th>
  <th>ओपन सोर्स</th>
  <th>Pro</th>
  <th>Power</th>
  <th>Enterprise</th>
</tr>
</thead>
<tbody>
<tr class="section-header"><td colspan="5">प्लेटफ़ॉर्म</td></tr>
<tr><td>सभी चैनल</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>सभी इंटीग्रेशन</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>वर्गीकरण एवं नीति इंजन</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>स्किल्स, plugin, webhook</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>ब्राउज़र ऑटोमेशन</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>निष्पादन वातावरण</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>एजेंट टीम</td><td>&#10003;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">AI एवं सर्च</td></tr>
<tr><td>LLM प्रदाता</td><td>अपना लाएँ</td><td>प्रबंधित</td><td>प्रबंधित</td><td>प्रबंधित</td></tr>
<tr><td>वेब सर्च</td><td>अपना लाएँ</td><td>शामिल</td><td>शामिल</td><td>शामिल</td></tr>
<tr><td>AI उपयोग</td><td>आपकी API सीमाएँ</td><td>मानक</td><td>विस्तारित</td><td>कस्टम</td></tr>

<tr class="section-header"><td colspan="5">इंफ्रास्ट्रक्चर</td></tr>
<tr><td>क्लाउड टनल</td><td>&mdash;</td><td>&#10003;</td><td>एकाधिक</td><td>कस्टम</td></tr>
<tr><td>शेड्यूल किए गए कार्य</td><td>असीमित</td><td>&#10003;</td><td>असीमित</td><td>असीमित</td></tr>
<tr><td>स्वचालित अपडेट</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">समर्थन एवं प्रशासन</td></tr>
<tr><td>सामुदायिक समर्थन</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>प्राथमिकता समर्थन</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>बहु-सीट लाइसेंसिंग</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SSO / SAML</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SLA</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
</tbody>
</table>

## Triggerfish Gateway कैसे काम करता है

Triggerfish Gateway एक अलग उत्पाद नहीं है — यह उसी ओपन-सोर्स एजेंट के लिए एक
प्रबंधित बैकएंड है जो आप पहले से स्थानीय रूप से चलाते हैं।

1. **ऊपर सदस्यता लें** — चेकआउट के बाद आपको ईमेल द्वारा अपनी लाइसेंस कुंजी प्राप्त होगी
2. **`triggerfish dive --force` चलाएँ** और अपने प्रदाता के रूप में Triggerfish Gateway चुनें
3. **अपनी लाइसेंस कुंजी दर्ज करें** या स्वचालित रूप से सक्रिय करने के लिए मैजिक लिंक फ़्लो का उपयोग करें

पहले से किसी अन्य मशीन पर सदस्यता ली है? `triggerfish dive --force` चलाएँ,
Triggerfish Gateway चुनें, और अपने ईमेल से साइन इन करने के लिए "मेरे पास पहले से खाता है" चुनें।

आपकी लाइसेंस कुंजी आपके OS कीचेन में संग्रहीत है। आप ग्राहक पोर्टल के माध्यम से
कभी भी अपनी सदस्यता प्रबंधित कर सकते हैं।

## अक्सर पूछे जाने वाले प्रश्न {.faq-section}

### क्या मैं ओपन सोर्स और क्लाउड के बीच स्विच कर सकता हूँ?

हाँ। आपकी एजेंट कॉन्फ़िग एक ही YAML फ़ाइल है। किसी भी समय
पुनर्कॉन्फ़िगर करने के लिए `triggerfish dive --force` चलाएँ। अपनी API कुंजियों से Triggerfish Gateway पर
या वापस स्विच करें — आपका SPINE, स्किल्स, चैनल और डेटा बिल्कुल वैसे ही रहते हैं।

### Triggerfish Gateway कौन सा LLM उपयोग करता है?

Triggerfish Gateway अनुकूलित मॉडल इंफ्रास्ट्रक्चर के माध्यम से रूट करता है। मॉडल
चयन आपके लिए प्रबंधित किया जाता है — हम सर्वोत्तम लागत/गुणवत्ता संतुलन चुनते हैं और
कैशिंग, फ़ेलओवर, और अनुकूलन को स्वचालित रूप से संभालते हैं।

### क्या मैं क्लाउड के साथ अपनी API कुंजियों का उपयोग कर सकता हूँ?

हाँ। Triggerfish फ़ेलओवर चेन का समर्थन करता है। आप क्लाउड को अपने
प्राथमिक प्रदाता के रूप में कॉन्फ़िगर कर सकते हैं और अपनी Anthropic या OpenAI कुंजी पर
फ़ॉलबैक कर सकते हैं, या इसके विपरीत।

### यदि मेरी सदस्यता समाप्त हो जाए तो क्या होगा?

आपका एजेंट चलता रहेगा। यह केवल-स्थानीय मोड में वापस आ जाता है — यदि आपने अपनी
API कुंजियाँ कॉन्फ़िगर की हैं, तो वे अभी भी काम करती हैं। क्लाउड सुविधाएँ (प्रबंधित LLM, सर्च,
टनल) पुनः सदस्यता लेने तक बंद हो जाती हैं। कोई डेटा नहीं खोता।

### क्या मेरा डेटा आपके सर्वर से होकर गुजरता है?

LLM अनुरोध क्लाउड Gateway के माध्यम से मॉडल प्रदाता को प्रॉक्सी किए जाते हैं।
हम वार्तालाप सामग्री संग्रहीत नहीं करते। बिलिंग के लिए उपयोग मेटाडेटा लॉग किया जाता है।
आपका एजेंट, डेटा, SPINE, और स्किल्स पूरी तरह आपकी मशीन पर रहते हैं।

### मैं अपनी सदस्यता कैसे प्रबंधित करूँ?

भुगतान विधियों को अपडेट करने, योजनाएँ बदलने, या रद्द करने के लिए ग्राहक पोर्टल पर जाएँ।
