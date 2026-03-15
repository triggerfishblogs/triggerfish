# Agent Execution Environment

Agent Execution Environment Triggerfish کی self-development capability ہے — ایک
first-class code workspace جہاں ایجنٹ کوڈ لکھ سکتا ہے، execute کر سکتا ہے، output اور
errors observe کر سکتا ہے، issues fix کر سکتا ہے، اور کوئی چیز کام کرنے تک iterate
کر سکتا ہے۔ یہی وہ چیز ہے جو ایجنٹ کو integrations build کرنے، ideas test کرنے، اور
اپنے نئے tools بنانے کے قابل بناتی ہے۔

## Plugin Sandbox نہیں

Execution environment [Plugin Sandbox](./plugins) سے بنیادی طور پر مختلف ہے۔ یہ فرق
سمجھنا ضروری ہے:

- **Plugin Sandbox** سسٹم کو untrusted third-party code **سے** محفوظ کرتا ہے
- **Exec Environment** ایجنٹ کو اپنا کوڈ لکھنے، چلانے، اور debug کرنے کی power **دیتا ہے**

Plugin sandbox defensive ہے۔ Exec environment productive ہے۔ یہ مخالف مقاصد serve
کرتے ہیں اور مختلف سیکیورٹی profiles رکھتے ہیں۔

| پہلو                | Plugin Sandbox                        | Agent Exec Environment                  |
| ------------------- | ------------------------------------- | --------------------------------------- |
| **مقصد**            | سسٹم کو untrusted code سے محفوظ کریں | ایجنٹ کو چیزیں build کرنے کی power دیں |
| **Filesystem**      | کوئی نہیں (مکمل sandboxed)           | صرف workspace directory                 |
| **Network**         | صرف declared endpoints               | Policy-governed allow/deny lists        |
| **Package install** | اجازت نہیں                           | اجازت ہے (npm، pip، deno add)           |
| **Execution time**  | Strict timeout                        | Generous timeout (configurable)         |
| **Iteration**       | Single run                            | Unlimited write/run/fix loops           |
| **Persistence**     | Ephemeral                             | Workspace sessions میں persist ہوتی ہے |

## Feedback Loop

بنیادی quality differentiator۔ یہ وہی pattern ہے جو Claude Code جیسے tools کو
effective بناتا ہے — ایک tight write/run/fix cycle جہاں ایجنٹ بالکل وہی دیکھتا ہے
جو ایک human developer دیکھے گا۔

### قدم 1: لکھیں

ایجنٹ `write_file` استعمال کر کے اپنی workspace میں files بناتا یا modify کرتا ہے۔
Workspace موجودہ ایجنٹ تک scoped ایک real filesystem directory ہے۔

### قدم 2: Execute کریں

ایجنٹ `run_command` کے ذریعے کوڈ چلاتا ہے، مکمل stdout، stderr، اور exit code receive
کرتا ہے۔ کوئی output hidden یا summarized نہیں ہوتی۔ ایجنٹ بالکل وہی دیکھتا ہے جو
آپ terminal میں دیکھیں گے۔

### قدم 3: Observe کریں

ایجنٹ مکمل output پڑھتا ہے۔ اگر errors ہوئے، یہ مکمل stack trace، error messages، اور
diagnostic output دیکھتا ہے۔ اگر tests fail ہوئے، یہ دیکھتا ہے کون سے tests fail ہوئے
اور کیوں۔

### قدم 4: Fix کریں

ایجنٹ جو observe کیا اس کی بنیاد پر کوڈ edit کرتا ہے، مخصوص files اپ ڈیٹ کرنے کے
لیے `write_file` یا `edit_file` استعمال کرتا ہے۔

### قدم 5: دہرائیں

ایجنٹ دوبارہ چلاتا ہے۔ یہ loop جاری رہتا ہے جب تک کوڈ کام نہ کرے۔

### قدم 6: Persist کریں

کام کرنے کے بعد، ایجنٹ اپنا کام [skill](./skills) (SKILL.md + supporting files) کے
طور پر save کر سکتا ہے، integration کے طور پر register کر سکتا ہے، cron job میں wire
کر سکتا ہے، یا tool کے طور پر دستیاب بنا سکتا ہے۔

::: tip Persist step وہ ہے جو exec environment کو صرف scratchpad سے زیادہ بناتا ہے۔
کام کرنے والا کوڈ صرف غائب نہیں ہوتا — ایجنٹ اسے ایک reusable skill میں package کر
سکتا ہے جو schedule پر چلے، triggers کا جواب دے، یا demand پر invoke ہو۔ :::

## Available Tools

| Tool             | تفصیل                                         | Output                                         |
| ---------------- | ----------------------------------------------- | ---------------------------------------------- |
| `write_file`     | Workspace میں file لکھیں یا overwrite کریں     | File path، bytes written                       |
| `read_file`      | Workspace سے file contents پڑھیں               | File contents بطور string                      |
| `edit_file`      | File میں targeted edits apply کریں             | Updated file contents                          |
| `run_command`    | Workspace میں shell command execute کریں       | stdout، stderr، exit code، duration            |
| `list_directory` | Workspace میں files list کریں (recursive اختیاری) | File listing with sizes                      |
| `search_files`   | File contents تلاش کریں (grep-like)            | Matching lines with file:line references       |

## Workspace Structure

ہر ایجنٹ کو ایک isolated workspace directory ملتی ہے جو sessions میں persist ہوتی ہے:

```
~/.triggerfish/workspace/
  <agent-id>/                     # Per-agent workspace
    scratch/                      # عارضی working files
    integrations/                 # Integration code زیر ترقی
      notion-sync/
        index.ts
        index_test.ts
        package.json
      salesforce-report/
        main.py
        test_main.py
    skills/                       # Skills زیر تصنیف
      morning-briefing/
        SKILL.md
        briefing.ts
    .exec_history                 # Audit کے لیے Execution log
  background/
    <session-id>/                 # Background tasks کے لیے عارضی workspace
```

Workspaces agents کے درمیان isolated ہیں۔ ایک ایجنٹ دوسرے کی workspace access نہیں کر
سکتا۔

## Integration Development Flow

جب آپ ایجنٹ سے نئی integration build کرنے کو کہیں (مثلاً، "میرے Notion سے جڑو اور
tasks sync کرو")، ایجنٹ ایک natural development workflow follow کرتا ہے:

1. **Explore** — `run_command` استعمال کر کے API endpoints test کرتا ہے، auth چیک
   کرتا ہے، response shapes سمجھتا ہے
2. **Scaffold** — `write_file` استعمال کر کے integration code لکھتا ہے، اس کے ساتھ
   test file بناتا ہے
3. **Test** — `run_command` سے tests چلاتا ہے، failures دیکھتا ہے، iterate کرتا ہے
4. **Install deps** — `run_command` استعمال کر کے required packages شامل کرتا ہے
   (npm، pip، deno add)
5. **Iterate** — Write، run، fix loop جب تک tests pass نہ ہوں اور integration end-to-end
   کام نہ کرے
6. **Persist** — Skill کے طور پر save کرتا ہے یا cron job میں wire کرتا ہے
7. **Approval** — Self-authored skill `PENDING_APPROVAL` state میں داخل ہوتی ہے؛
   آپ review اور approve کرتے ہیں

## Language اور Runtime Support

Execution environment host system پر چلتا ہے (WASM میں نہیں)، متعدد runtimes تک رسائی
کے ساتھ:

| Runtime | Available via                        | Use Case                              |
| ------- | ------------------------------------ | ------------------------------------- |
| Deno    | Direct execution                     | TypeScript/JavaScript (first-class)   |
| Node.js | `run_command node`                   | npm ecosystem access                  |
| Python  | `run_command python`                 | Data science، ML، scripting           |
| Shell   | `run_command sh` / `run_command bash` | System automation، glue scripts      |

## Security Boundaries

Exec environment plugin sandbox سے زیادہ permissive ہے، لیکن ہر قدم پر policy-controlled
رہتا ہے۔

### Hard Boundaries

یہ boundaries کبھی نہیں پار ہوتیں، configuration سے قطع نظر:

- Workspace directory سے باہر لکھ نہیں سکتا
- Denylist پر commands execute نہیں کر سکتا (`rm -rf /`، `sudo`، وغیرہ)
- دوسرے agents کی workspaces access نہیں کر سکتا
- تمام network calls policy hooks کے ذریعے governed
- تمام output classified اور session taint میں contribute کرتا ہے
- Resource limits نافذ: disk space، CPU time per execution، memory

::: warning سیکیورٹی ایجنٹ کا چلایا ہوا ہر command `PRE_TOOL_CALL` hook سے گزرتا
ہے۔ Policy engine execution شروع ہونے سے پہلے اسے command allowlist/denylist کے خلاف
چیک کرتی ہے۔ Dangerous commands یقینی طور پر blocked ہوتے ہیں — LLM یہ فیصلہ متاثر
نہیں کر سکتا۔ :::

### Enterprise Controls

Enterprise admins کے پاس exec environment پر اضافی controls ہیں:

- مخصوص agents یا roles کے لیے **exec مکمل disable** کریں
- **Available runtimes restrict** کریں (مثلاً، صرف Deno allow کریں، Python اور shell
  block کریں)
- Per agent **resource limits** set کریں (disk quota، CPU time، memory ceiling)
- Classification threshold سے اوپر تمام exec operations کے لیے **Approval ضروری** کریں
- ڈیفالٹ dangerous-command list سے پرے **Custom command denylist**
