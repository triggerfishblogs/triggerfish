# Codebase Exploration

`explore` tool ایجنٹ کو codebases اور directories کی fast، structured understanding
دیتا ہے۔ Manually `read_file`، `list_directory`، اور `search_files` sequence میں
call کرنے کی بجائے، ایجنٹ ایک بار `explore` call کرتا ہے اور parallel sub-agents
کی produced structured report واپس ملتی ہے۔

## Tool

### `explore`

Structure، patterns، اور conventions سمجھنے کے لیے directory یا codebase explore
کریں۔ Read-only۔

| Parameter | Type   | ضروری | تفصیل                                                          |
| --------- | ------ | :---: | --------------------------------------------------------------- |
| `path`    | string | ہاں   | Explore کرنے کی directory یا file                              |
| `focus`   | string | نہیں  | کیا تلاش کریں (مثلاً "auth patterns"، "test structure")       |
| `depth`   | string | نہیں  | کتنا thorough: `shallow`، `standard` (ڈیفالٹ)، یا `deep`      |

## Depth Levels

| Depth      | Spawned Agents | کیا Analyze ہوتا ہے                                         |
| ---------- | -------------- | ------------------------------------------------------------ |
| `shallow`  | 2              | Directory tree + dependency manifests                        |
| `standard` | 3-4            | Tree + manifests + code patterns + focus (اگر specify کیا)  |
| `deep`     | 5-6            | اوپر سب کچھ + import graph tracing + git history            |

## یہ کیسے کام کرتا ہے

Explore tool parallel sub-agents spawn کرتا ہے، ہر ایک مختلف facet پر focused:

1. **Tree agent** -- Directory structure map کرتا ہے (3 levels deep)، convention
   سے key files identify کرتا ہے (`mod.ts`، `main.ts`، `deno.json`، `README.md`،
   وغیرہ)
2. **Manifest agent** -- Dependency files پڑھتا ہے (`deno.json`، `package.json`،
   `tsconfig.json`)، dependencies، scripts، اور entry points list کرتا ہے
3. **Pattern agent** -- Coding patterns detect کرنے کے لیے source files sample
   کرتا ہے: module structure، error handling، type conventions، import style،
   naming، testing
4. **Focus agent** -- Focus query سے related files اور patterns تلاش کرتا ہے
5. **Import agent** (صرف deep) -- Entry points سے import graphs trace کرتا ہے،
   circular dependencies detect کرتا ہے
6. **Git agent** (صرف deep) -- Recent commits، current branch، uncommitted changes
   analyze کرتا ہے

تمام agents concurrently چلتے ہیں۔ نتائج ایک structured `ExploreResult` میں
assemble ہوتے ہیں:

```json
{
  "path": "src/core",
  "depth": "standard",
  "tree": "src/core/\n├── types/\n│   ├── classification.ts\n│   ...",
  "key_files": [
    { "path": "src/core/types/classification.ts", "role": "Classification levels" }
  ],
  "patterns": [
    { "name": "Result pattern", "description": "Uses Result<T,E> for error handling", "examples": [...] }
  ],
  "dependencies": "...",
  "focus_findings": "...",
  "summary": "Core module with classification types, policy engine, and session management."
}
```

## Agent اسے کب استعمال کرتا ہے

ایجنٹ کو ان situations میں `explore` استعمال کرنے کی ہدایت ہے:

- Unfamiliar code modify کرنے سے پہلے
- جب "یہ کیا کرتا ہے" یا "یہ کیسے structured ہے" پوچھا جائے
- Existing code کے ساتھ کوئی بھی non-trivial task شروع کرتے وقت
- جب اسے follow کرنے کے لیے صحیح file یا pattern تلاش کرنی ہو

Exploring کے بعد، ایجنٹ نئی code لکھتے وقت جو patterns اور conventions اسے ملے
ان کا reference کرتا ہے، existing codebase کے ساتھ consistency یقینی بناتا ہے۔

## مثالیں

```
# Directory کا quick overview
explore({ path: "src/auth" })

# مخصوص patterns کے لیے focused search
explore({ path: "src/auth", focus: "how tokens are validated" })

# Git history اور import graphs سمیت deep analysis
explore({ path: "src/core", depth: "deep" })

# Tests لکھنے سے پہلے test conventions سمجھیں
explore({ path: "tests/", focus: "test patterns and assertions" })
```
