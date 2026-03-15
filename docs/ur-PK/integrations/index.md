# Integrations بنانا

Triggerfish کو extend کرنے کے لیے designed کیا گیا ہے۔ چاہے آپ نیا data source جوڑنا
چاہیں، workflow automate کرنا چاہیں، اپنے ایجنٹ کو نئی skills دینا چاہیں، یا external
events پر react کرنا چاہیں، ایک اچھی طرح سے defined integration pathway ہے — اور ہر
pathway اسی security model کا احترام کرتی ہے۔

## Integration Pathways

Triggerfish platform کو extend کرنے کے پانچ مختلف طریقے پیش کرتا ہے۔ ہر ایک مختلف
مقصد پورا کرتا ہے، لیکن سب ایک ہی سیکیورٹی ضمانتیں share کرتے ہیں: classification
enforcement، taint tracking، policy hooks، اور مکمل audit logging۔

| Pathway                                            | مقصد                                              | بہترین کے لیے                                                                      |
| -------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [MCP Gateway](./mcp-gateway)                       | External tool servers جوڑیں                       | Model Context Protocol کے ذریعے standardized agent-to-tool communication            |
| [Plugins](./plugins)                               | Custom tools سے ایجنٹ کو بڑھائیں                 | Agent-built integrations، API connectors، external system queries، workflows        |
| [Exec Environment](./exec-environment)             | ایجنٹ اپنا کوڈ لکھتا اور چلاتا ہے               | Integrations بنانا، prototyping، testing، اور feedback loop میں iterate کرنا       |
| [Skills](./skills)                                 | Instructions کے ذریعے ایجنٹ کو نئی capabilities دیں | Reusable behaviors، community marketplace، agent self-authoring                    |
| [Browser Automation](./browser)                    | CDP کے ذریعے browser instance control کریں        | Web research، form filling، scraping، automated web workflows                      |
| [Webhooks](./webhooks)                             | External services سے inbound events receive کریں  | Emails، alerts، CI/CD events، calendar changes پر real-time reactions              |
| [GitHub](./github)                                 | مکمل GitHub workflow integration                  | PR review loops، issue triage، webhooks + exec + skills کے ذریعے branch management |
| [Google Workspace](./google-workspace)             | Gmail، Calendar، Tasks، Drive، Sheets جوڑیں      | 14 tools کے ساتھ bundled OAuth2 integration                                        |
| [Obsidian](./obsidian)                             | Obsidian vault notes پڑھیں، لکھیں، تلاش کریں    | Classification-gated note access                                                   |

## Security Model

ہر integration — pathway سے قطع نظر — اسی سیکیورٹی constraints کے تحت کام کرتی ہے۔

### سب کچھ UNTRUSTED سے شروع ہوتا ہے

نئے MCP servers، plugins، channels، اور webhook sources سب ڈیفالٹ `UNTRUSTED` state
پر ہوتے ہیں۔ وہ ایجنٹ کے ساتھ ڈیٹا exchange نہیں کر سکتے جب تک کہ owner (personal
tier) یا admin (enterprise tier) انہیں صراحتاً classify نہ کرے۔

```
UNTRUSTED  -->  CLASSIFIED  (review کے بعد، classification level تفویض)
UNTRUSTED  -->  BLOCKED     (صراحتاً ممنوع)
```

### Classification گزرتی رہتی ہے

جب کوئی integration ڈیٹا واپس کرتی ہے، وہ ڈیٹا ایک classification level لے جاتا ہے۔
Classified ڈیٹا access کرنا session taint کو match کرنے کے لیے escalate کرتا ہے۔
Tainted ہونے کے بعد، session کم-classification منزل کو output نہیں کر سکتا۔ یہ
[No Write-Down قاعدہ](/ur-PK/security/no-write-down) ہے — یہ مقررہ ہے اور override
نہیں کیا جا سکتا۔

### Policy Hooks ہر حد پر نافذ ہوتے ہیں

تمام integration actions یقینی policy hooks سے گزرتے ہیں:

| Hook                    | کب Fire ہوتا ہے                                                         |
| ----------------------- | ----------------------------------------------------------------------- |
| `PRE_CONTEXT_INJECTION` | External ڈیٹا agent context میں داخل ہوتا ہے (webhooks، plugin responses) |
| `PRE_TOOL_CALL`         | ایجنٹ tool call request کرتا ہے (MCP، exec، browser)                   |
| `POST_TOOL_RESPONSE`    | Tool ڈیٹا واپس کرتا ہے (response classify کریں، taint اپ ڈیٹ کریں)    |
| `PRE_OUTPUT`            | Response سسٹم چھوڑتا ہے (آخری classification check)                   |

یہ hooks pure functions ہیں — کوئی LLM calls نہیں، کوئی randomness نہیں، کوئی bypass
نہیں۔ ایک ہی input ہمیشہ ایک ہی فیصلہ دیتا ہے۔

### Audit Trail

ہر integration action logged ہے: کیا call کیا گیا، کس نے call کیا، policy فیصلہ کیا
تھا، اور session taint کیسے تبدیل ہوا۔ یہ audit trail ناقابل تبدیل ہے اور compliance
review کے لیے دستیاب ہے۔

::: warning سیکیورٹی LLM policy hook فیصلوں کو bypass، modify، یا متاثر نہیں کر
سکتا۔ Hooks LLM layer کے نیچے کوڈ میں چلتے ہیں۔ AI actions request کرتا ہے — policy
layer فیصلہ کرتی ہے۔ :::

## صحیح Pathway منتخب کرنا

اپنے use case کے لیے مناسب integration pathway منتخب کرنے کے لیے یہ decision guide
استعمال کریں:

- **آپ ایک standard tool server جوڑنا چاہتے ہیں** — [MCP Gateway](./mcp-gateway) استعمال
  کریں۔ اگر tool MCP بولتا ہے، یہی راستہ ہے۔
- **آپ کو external API کے خلاف custom code چلانا ہے** — [Plugins](./plugins) استعمال
  کریں۔ ایجنٹ runtime پر plugins build، scan، اور load کر سکتا ہے۔ Plugins sandboxed
  سیکیورٹی scanning کے ساتھ چلتے ہیں۔
- **آپ ایجنٹ کو کوڈ build اور iterate کرنے دینا چاہتے ہیں** — [Exec Environment](./exec-environment)
  استعمال کریں۔ ایجنٹ کو مکمل write/run/fix loop کے ساتھ workspace ملتی ہے۔
- **آپ ایجنٹ کو نیا behavior سکھانا چاہتے ہیں** — [Skills](./skills) استعمال کریں۔
  Instructions کے ساتھ `SKILL.md` لکھیں، یا ایجنٹ کو اپنا author کرنے دیں۔
- **آپ کو web interactions automate کرنی ہیں** — [Browser Automation](./browser) استعمال
  کریں۔ Domain policy enforcement کے ساتھ CDP-controlled Chromium۔
- **آپ کو real time میں external events پر react کرنا ہے** — [Webhooks](./webhooks)
  استعمال کریں۔ Inbound events verified، classified، اور ایجنٹ کو route کیے جاتے ہیں۔

::: tip یہ pathways ایک دوسرے سے exclusive نہیں ہیں۔ ایک skill اندرونی طور پر browser
automation استعمال کر سکتی ہے۔ ایک plugin webhook سے trigger ہو سکتا ہے۔ Exec environment
میں agent-authored integration کو skill کے طور پر persist کیا جا سکتا ہے۔ یہ قدرتی
طور پر compose ہوتے ہیں۔ :::
