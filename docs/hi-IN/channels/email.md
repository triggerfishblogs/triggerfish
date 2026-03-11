# Email

अपने Triggerfish agent को email से जोड़ें ताकि यह IMAP के माध्यम से संदेश प्राप्त कर सके और
SMTP relay सेवा के माध्यम से जवाब भेज सके। Adapter आउटबाउंड email के लिए
SendGrid, Mailgun, और Amazon SES जैसी सेवाओं का समर्थन करता है, और इनबाउंड संदेशों के लिए
किसी भी IMAP server को पोल करता है।

## डिफ़ॉल्ट Classification

Email डिफ़ॉल्ट रूप से `CONFIDENTIAL` classification पर सेट है। Email में अक्सर संवेदनशील
सामग्री (अनुबंध, खाता सूचनाएँ, व्यक्तिगत पत्राचार) होती है, इसलिए
`CONFIDENTIAL` सुरक्षित डिफ़ॉल्ट है।

## सेटअप

### चरण 1: SMTP Relay चुनें

Triggerfish HTTP-आधारित SMTP relay API के माध्यम से आउटबाउंड email भेजता है। समर्थित
सेवाओं में शामिल हैं:

| सेवा       | API Endpoint                                                     |
| ---------- | ---------------------------------------------------------------- |
| SendGrid   | `https://api.sendgrid.com/v3/mail/send`                          |
| Mailgun    | `https://api.mailgun.net/v3/YOUR_DOMAIN/messages`                |
| Amazon SES | `https://email.us-east-1.amazonaws.com/v2/email/outbound-emails` |

इनमें से किसी एक सेवा के लिए साइन अप करें और API key प्राप्त करें।

### चरण 2: प्राप्त करने के लिए IMAP कॉन्फ़िगर करें

Email प्राप्त करने के लिए आपको IMAP क्रेडेंशियल की आवश्यकता है। अधिकांश email प्रदाता
IMAP का समर्थन करते हैं:

| प्रदाता   | IMAP Host               | पोर्ट |
| ---------- | ----------------------- | ----- |
| Gmail      | `imap.gmail.com`        | 993   |
| Outlook    | `outlook.office365.com` | 993   |
| Fastmail   | `imap.fastmail.com`     | 993   |
| कस्टम     | आपका mail server        | 993   |

::: info Gmail App Passwords यदि आप 2-फ़ैक्टर प्रमाणीकरण के साथ Gmail का उपयोग करते हैं, तो आपको
IMAP एक्सेस के लिए एक [App Password](https://myaccount.google.com/apppasswords) उत्पन्न करना होगा।
आपका सामान्य Gmail पासवर्ड काम नहीं करेगा। :::

### चरण 3: Triggerfish कॉन्फ़िगर करें

अपने `triggerfish.yaml` में Email channel जोड़ें:

```yaml
channels:
  email:
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapHost: "imap.gmail.com"
    imapPort: 993
    imapUser: "you@gmail.com"
    fromAddress: "triggerfish@yourdomain.com"
    ownerEmail: "you@gmail.com"
```

Secrets (SMTP API key, IMAP पासवर्ड) `triggerfish config add-channel email` के दौरान दर्ज किए जाते हैं
और OS keychain में संग्रहीत होते हैं।

| विकल्प            | प्रकार | आवश्यक    | विवरण                                                         |
| ----------------- | ------ | --------- | ------------------------------------------------------------- |
| `smtpApiUrl`      | string | हाँ       | SMTP relay API endpoint URL                                   |
| `imapHost`        | string | हाँ       | IMAP server hostname                                          |
| `imapPort`        | number | नहीं      | IMAP server पोर्ट (डिफ़ॉल्ट: `993`)                          |
| `imapUser`        | string | हाँ       | IMAP username (आमतौर पर आपका email पता)                       |
| `fromAddress`     | string | हाँ       | आउटगोइंग emails के लिए From पता                              |
| `pollInterval`    | number | नहीं      | नए emails की कितनी बार जाँच करनी है, ms में (डिफ़ॉल्ट: `30000`) |
| `classification`  | string | नहीं      | Classification स्तर (डिफ़ॉल्ट: `CONFIDENTIAL`)                |
| `ownerEmail`      | string | अनुशंसित  | Owner सत्यापन के लिए आपका email पता                           |

::: warning क्रेडेंशियल SMTP API key और IMAP पासवर्ड OS keychain
(Linux: GNOME Keyring, macOS: Keychain Access) में संग्रहीत हैं। ये कभी
`triggerfish.yaml` में दिखाई नहीं देते। :::

### चरण 4: Triggerfish शुरू करें

```bash
triggerfish stop && triggerfish start
```

कनेक्शन की पुष्टि करने के लिए कॉन्फ़िगर किए गए पते पर email भेजें।

## Owner पहचान

Triggerfish प्रेषक के email पते की तुलना कॉन्फ़िगर किए गए `ownerEmail` से करके
owner स्थिति निर्धारित करता है:

- **मिलान** -- संदेश एक owner कमांड है
- **कोई मिलान नहीं** -- संदेश `PUBLIC` taint के साथ बाहरी इनपुट है

यदि कोई `ownerEmail` कॉन्फ़िगर नहीं है, तो सभी संदेशों को owner से आने वाला माना जाता है।

## डोमेन-आधारित Classification

अधिक विस्तृत नियंत्रण के लिए, email डोमेन-आधारित प्राप्तकर्ता classification का समर्थन करता है।
यह विशेष रूप से एंटरप्राइज़ वातावरण में उपयोगी है:

- `@yourcompany.com` से emails को `INTERNAL` के रूप में वर्गीकृत किया जा सकता है
- अज्ञात डोमेन से emails `EXTERNAL` पर डिफ़ॉल्ट होती हैं
- Admin आंतरिक डोमेन की सूची कॉन्फ़िगर कर सकता है

```yaml
channels:
  email:
    # ... अन्य कॉन्फ़िगरेशन
    internalDomains:
      - "yourcompany.com"
      - "subsidiary.com"
```

इसका मतलब है कि policy engine email कहाँ से आती है इसके आधार पर अलग-अलग नियम लागू करता है:

| प्रेषक डोमेन                | Classification |
| ---------------------------- | :------------: |
| कॉन्फ़िगर किया गया आंतरिक डोमेन | `INTERNAL`    |
| अज्ञात डोमेन                | `EXTERNAL`     |

## यह कैसे काम करता है

### इनबाउंड संदेश

Adapter कॉन्फ़िगर किए गए अंतराल (डिफ़ॉल्ट: हर 30
सेकंड) पर नए, अपठित संदेशों के लिए IMAP server को पोल करता है। जब नया email आता है:

1. प्रेषक का पता निकाला जाता है
2. `ownerEmail` के विरुद्ध Owner स्थिति की जाँच की जाती है
3. Email body को message handler को अग्रेषित किया जाता है
4. प्रत्येक email thread को प्रेषक पते के आधार पर session ID से मैप किया जाता है
   (`email-sender@example.com`)

### आउटबाउंड संदेश

जब agent जवाब देता है, adapter कॉन्फ़िगर किए गए SMTP
relay HTTP API के माध्यम से जवाब भेजता है। जवाब में शामिल है:

- **From** -- कॉन्फ़िगर किया गया `fromAddress`
- **To** -- मूल प्रेषक का email पता
- **Subject** -- "Triggerfish" (डिफ़ॉल्ट)
- **Body** -- सादे पाठ के रूप में agent की प्रतिक्रिया

## पोल अंतराल

डिफ़ॉल्ट पोल अंतराल 30 सेकंड है। आप अपनी आवश्यकताओं के आधार पर इसे समायोजित कर सकते हैं:

```yaml
channels:
  email:
    # ... अन्य कॉन्फ़िगरेशन
    pollInterval: 10000 # हर 10 सेकंड में जाँच करें
```

::: tip प्रतिक्रियाशीलता और संसाधनों को संतुलित करें छोटा पोल अंतराल का मतलब है
आने वाले email के लिए तेज़ प्रतिक्रिया, लेकिन अधिक बार-बार IMAP कनेक्शन। अधिकांश
व्यक्तिगत उपयोग मामलों के लिए, 30 सेकंड एक अच्छा संतुलन है। :::

## Classification बदलना

```yaml
channels:
  email:
    # ... अन्य कॉन्फ़िगरेशन
    classification: CONFIDENTIAL
```

मान्य स्तर: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`।
