# वर्गीकरण स्तर निवडणे

Triggerfish मधील प्रत्येक channel, MCP server, integration आणि plugin ला वर्गीकरण
स्तर असणे आवश्यक आहे. हे पृष्ठ तुम्हाला योग्य स्तर निवडण्यात मदत करते.

## चार स्तर

| स्तर             | अर्थ                                                        | डेटा कुठे वाहतो...                 |
| ---------------- | ----------------------------------------------------------- | ---------------------------------- |
| **PUBLIC**       | कोणालाही पाहण्यासाठी सुरक्षित                               | कुठेही                             |
| **INTERNAL**     | फक्त तुमच्यासाठी — काहीही संवेदनशील नाही, पण public नाही    | INTERNAL, CONFIDENTIAL, RESTRICTED |
| **CONFIDENTIAL** | संवेदनशील डेटा जो तुम्हाला कधीही लीक व्हायला नको असेल       | CONFIDENTIAL, RESTRICTED           |
| **RESTRICTED**   | सर्वात संवेदनशील — कायदेशीर, वैद्यकीय, आर्थिक, PII         | फक्त RESTRICTED                    |

डेटा फक्त **वर किंवा बाजूला** वाहू शकतो, कधीही खाली नाही. हा
[no-write-down नियम](/mr-IN/security/no-write-down) आहे आणि तो override केला जाऊ शकत नाही.

## विचारण्यायोग्य दोन प्रश्न

तुम्ही कॉन्फिगर करत असलेल्या कोणत्याही integration साठी, विचारा:

**1. हा स्रोत return करू शकणारा सर्वात संवेदनशील डेटा कोणता आहे?**

हे **किमान** वर्गीकरण स्तर ठरवते. जर MCP server आर्थिक डेटा return करू शकत असेल,
तर ते किमान CONFIDENTIAL असणे आवश्यक आहे — जरी बहुतेक साधने निरुपद्रवी metadata
return करत असतील.

**2. Session डेटा _या_ गंतव्यस्थानावर वाहिल्यास मला आरामदायक वाटेल का?**

हे **कमाल** वर्गीकरण स्तर ठरवते जे तुम्हाला assign करायचे असेल. उच्च वर्गीकरण म्हणजे
तुम्ही ते वापरता तेव्हा session taint escalates होतो, जे नंतर डेटा कुठे वाहू शकतो
ते मर्यादित करते.

## डेटा प्रकारानुसार वर्गीकरण

| डेटा प्रकार                                        | शिफारस केलेला स्तर | कारण                                           |
| -------------------------------------------------- | ------------------- | ---------------------------------------------- |
| हवामान, सार्वजनिक वेब पृष्ठे, time zones           | **PUBLIC**          | कोणालाही मुक्तपणे उपलब्ध                        |
| तुमच्या वैयक्तिक नोट्स, bookmarks, task lists      | **INTERNAL**        | खाजगी परंतु उघड झाल्यास हानिकारक नाही           |
| अंतर्गत wikis, team docs, project boards            | **INTERNAL**        | संस्था-अंतर्गत माहिती                           |
| Email, calendar events, contacts                   | **CONFIDENTIAL**    | नावे, schedules, नातेसंबंध समाविष्ट आहेत       |
| CRM डेटा, sales pipeline, customer records         | **CONFIDENTIAL**    | व्यवसाय-संवेदनशील, customer डेटा               |
| आर्थिक नोंदी, बँक खाती, invoices                  | **CONFIDENTIAL**    | आर्थिक माहिती                                  |
| Source code repositories (खाजगी)                   | **CONFIDENTIAL**    | बौद्धिक संपदा                                  |
| वैद्यकीय किंवा आरोग्य नोंदी                        | **RESTRICTED**      | कायदेशीरपणे संरक्षित (HIPAA, इ.)               |
| Government ID numbers, SSNs, passports             | **RESTRICTED**      | Identity theft जोखीम                           |
| कायदेशीर दस्तऐवज, NDA अंतर्गत करार                | **RESTRICTED**      | कायदेशीर exposure                              |
| Encryption keys, credentials, secrets              | **RESTRICTED**      | System compromise जोखीम                        |

## MCP Servers

`triggerfish.yaml` मध्ये MCP server जोडताना, वर्गीकरण दोन गोष्टी ठरवते:

1. **Session taint** — या server वरील कोणतेही साधन कॉल करणे session ला या
   स्तरावर escalate करते
2. **Write-down प्रतिबंध** — या स्तरापेक्षा आधीच tainted session या server ला
   डेटा _पाठवू_ शकत नाही

```yaml
mcp_servers:
  # PUBLIC — open data, no sensitivity
  weather:
    command: npx
    args: ["-y", "@mcp/server-weather"]
    classification: PUBLIC

  # INTERNAL — तुमचा स्वतःचा filesystem, खाजगी परंतु secrets नाही
  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/you/docs"]
    classification: INTERNAL

  # CONFIDENTIAL — खाजगी repos, customer issues ला प्रवेश करतो
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  # RESTRICTED — PII, medical records, legal docs सह database
  postgres:
    command: npx
    args: ["-y", "@mcp/server-postgres"]
    env:
      DATABASE_URL: "keychain:prod-db-url"
    classification: RESTRICTED
```

::: warning DEFAULT DENY जर तुम्ही `classification` वगळल्यास, server **UNTRUSTED**
म्हणून नोंदणीकृत होतो आणि gateway सर्व tool calls नाकारतो. तुम्ही स्पष्टपणे
स्तर निवडणे आवश्यक आहे. :::

### सामान्य MCP Server वर्गीकरण

| MCP Server                      | सुचवलेला स्तर  | तर्क                                          |
| ------------------------------- | --------------- | --------------------------------------------- |
| Filesystem (सार्वजनिक docs)     | PUBLIC          | फक्त सार्वजनिकरित्या उपलब्ध फाइल्स दाखवतो    |
| Filesystem (home directory)     | INTERNAL        | वैयक्तिक फाइल्स, काहीही गुप्त नाही            |
| Filesystem (work projects)      | CONFIDENTIAL    | मालकीचा कोड किंवा डेटा असू शकतो              |
| GitHub (फक्त public repos)      | INTERNAL        | Code public आहे परंतु usage patterns खाजगी आहेत |
| GitHub (खाजगी repos)            | CONFIDENTIAL    | मालकीचा source code                           |
| Slack                           | CONFIDENTIAL    | Workplace संवाद, शक्यतो संवेदनशील              |
| Database (analytics/reporting)  | CONFIDENTIAL    | Aggregated business data                      |
| Database (production with PII)  | RESTRICTED      | वैयक्तिकरित्या ओळखण्यायोग्य माहिती समाविष्ट   |
| Weather / time / calculator     | PUBLIC          | कोणताही संवेदनशील डेटा नाही                   |
| Web search                      | PUBLIC          | सार्वजनिकरित्या उपलब्ध माहिती return करतो     |
| Email                           | CONFIDENTIAL    | नावे, संवाद, attachments                      |
| Google Drive                    | CONFIDENTIAL    | दस्तऐवजांमध्ये संवेदनशील business data असू शकतो |

## Channels

Channel वर्गीकरण **ceiling** ठरवते — त्या channel ला deliver केल्या जाऊ शकणाऱ्या
डेटाची कमाल संवेदनशीलता.

```yaml
channels:
  cli:
    classification: INTERNAL # तुमचा स्थानिक terminal — internal data साठी सुरक्षित
  telegram:
    classification: INTERNAL # तुमचा खाजगी bot — owner साठी CLI सारखाच
  webchat:
    classification: PUBLIC # अनामिक अभ्यागत — फक्त public data
  email:
    classification: CONFIDENTIAL # Email खाजगी आहे परंतु forward केली जाऊ शकते
```

::: tip OWNER विरुद्ध NON-OWNER **owner** साठी, सर्व channels समान trust level
आहेत — तुम्ही कोणते app वापरता याची पर्वा न करता तुम्ही तुम्हीच आहात. Channel
वर्गीकरण **non-owner users** साठी (webchat वर अभ्यागत, Slack channel मधील सदस्य, इ.)
सर्वात महत्त्वाचे आहे जिथे ते त्यांना कोणता डेटा वाहू शकतो ते gates करते. :::

### Channel वर्गीकरण निवडणे

| प्रश्न                                                               | जर हो...                | जर नाही...              |
| --------------------------------------------------------------------- | ----------------------- | ----------------------- |
| या channel वरील messages एखादा अनोळखी पाहू शकतो का?                  | **PUBLIC**              | वाचत राहा               |
| हा channel फक्त तुमच्यासाठी वैयक्तिकरित्या आहे का?                   | **INTERNAL** किंवा जास्त | वाचत राहा               |
| Messages forward, screenshot किंवा third party द्वारे log केले जाऊ शकतात का? | **CONFIDENTIAL** cap   | **RESTRICTED** असू शकतो |
| Channel end-to-end encrypted आणि तुमच्या पूर्ण नियंत्रणात आहे का?    | **RESTRICTED** असू शकतो | **CONFIDENTIAL** cap    |

## चूक झाल्यास काय होते

**खूप कमी (उदा., CONFIDENTIAL server PUBLIC म्हणून चिन्हांकित):**

- या server चा डेटा session taint escalate करणार नाही
- Session classified data public channels ला वाहू शकते — **data leak जोखीम**
- हे धोकादायक दिशा आहे

**खूप जास्त (उदा., PUBLIC server CONFIDENTIAL म्हणून चिन्हांकित):**

- हा server वापरताना Session taint अनावश्यकपणे escalates होतो
- नंतर तुम्हाला lower-classified channels ला पाठवण्यापासून ब्लॉक होईल
- त्रासदायक परंतु **सुरक्षित** — खूप जास्त च्या बाजूने चूक करा

::: danger शंका असल्यास, **उच्च वर्गीकरण करा**. Server खरोखर कोणता डेटा return
करतो ते review केल्यानंतर तुम्ही ते नेहमी कमी करू शकता. Under-classifying सुरक्षा
जोखीम आहे; over-classifying फक्त एक गैरसोय आहे. :::

## Taint Cascade

व्यावहारिक प्रभाव समजणे तुम्हाला हुशारीने निवडण्यास मदत करते. एका session मध्ये काय
होते ते येथे आहे:

```
1. Session PUBLIC पासून सुरू होते
2. तुम्ही हवामानाबद्दल विचारता (PUBLIC server)     → taint PUBLIC राहतो
3. तुम्ही तुमच्या नोट्स तपासता (INTERNAL filesystem)    → taint INTERNAL ला escalates
4. तुम्ही GitHub issues query करता (CONFIDENTIAL)        → taint CONFIDENTIAL ला escalates
5. तुम्ही webchat ला post करण्याचा प्रयत्न करता (PUBLIC channel)   → BLOCKED (write-down violation)
6. तुम्ही session reset करता                         → taint PUBLIC ला परत येतो
7. तुम्ही webchat ला post करता                           → परवानगी
```

जर तुम्ही वारंवार CONFIDENTIAL साधन वापरल्यानंतर PUBLIC channel वापरत असाल, तर तुम्ही
वारंवार reset कराल. साधनाला खरोखर CONFIDENTIAL आवश्यक आहे का, किंवा channel
reclassify केला जाऊ शकतो का याचा विचार करा.

## Filesystem Paths

तुम्ही वैयक्तिक filesystem paths देखील classify करू शकता, जे उपयुक्त आहे जेव्हा
तुमच्या एजंटला mixed sensitivity असलेल्या directories मध्ये प्रवेश आहे:

```yaml
filesystem:
  default: INTERNAL
  paths:
    "/home/you/public": PUBLIC
    "/home/you/work/clients": CONFIDENTIAL
    "/home/you/legal": RESTRICTED
```

## Review Checklist

नवीन integration live करण्यापूर्वी:

- [ ] हा स्रोत return करू शकणारा सर्वात वाईट डेटा कोणता आहे? त्या स्तरावर classify करा.
- [ ] डेटा प्रकार table suggest करतो त्यापेक्षा classification किमान तितकेच उच्च आहे का?
- [ ] हा channel असल्यास, सर्व संभाव्य प्राप्तकर्त्यांसाठी classification योग्य आहे का?
- [ ] तुमच्या सामान्य workflow साठी taint cascade कार्य करते हे तुम्ही तपासले का?
- [ ] शंका असल्यास, तुम्ही कमी ऐवजी उच्च classify केले का?

## संबंधित पृष्ठे

- [No Write-Down नियम](/mr-IN/security/no-write-down) — निश्चित data flow नियम
- [कॉन्फिगरेशन](/mr-IN/guide/configuration) — पूर्ण YAML संदर्भ
- [MCP Gateway](/mr-IN/integrations/mcp-gateway) — MCP server सुरक्षा model
