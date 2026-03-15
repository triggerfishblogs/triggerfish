# Codebase Exploration

`explore` tool agent க்கு codebases மற்றும் directories இன் வேகமான, structured புரிதல் தருகிறது. Manual ஆக `read_file`, `list_directory`, மற்றும் `search_files` ஐ sequence இல் அழைப்பதற்கு பதிலாக, agent ஒருமுறை `explore` அழைக்கிறது மற்றும் parallel sub-agents produce செய்த structured report பெறுகிறது.

## Tool

### `explore`

Structure, patterns, மற்றும் conventions புரிந்துகொள்ள ஒரு directory அல்லது codebase explore செய்யவும். Read-only.

| Parameter | Type   | Required | விளக்கம்                                                          |
| --------- | ------ | -------- | -------------------------------------------------------------------- |
| `path`    | string | ஆம்      | Explore செய்ய Directory அல்லது file                               |
| `focus`   | string | இல்லை   | என்ன தேட வேண்டும் (உதா. "auth patterns", "test structure")        |
| `depth`   | string | இல்லை   | எவ்வளவு thorough: `shallow`, `standard` (default), அல்லது `deep`  |

## Depth நிலைகள்

| Depth      | Agents Spawned | என்ன Analyze ஆகிறது                                        |
| ---------- | -------------- | ------------------------------------------------------------ |
| `shallow`  | 2              | Directory tree + dependency manifests                        |
| `standard` | 3-4            | Tree + manifests + code patterns + focus (குறிப்பிட்டால்) |
| `deep`     | 5-6            | மேலே உள்ள அனைத்தும் + import graph tracing + git history   |

## எவ்வாறு செயல்படுகிறது

Explore tool parallel sub-agents spawn செய்கிறது, ஒவ்வொன்றும் வேறு facet இல் focused:

1. **Tree agent** -- Directory structure map செய்கிறது (3 levels deep), convention மூலம் key files அடையாளப்படுத்துகிறது (`mod.ts`, `main.ts`, `deno.json`, `README.md`, போன்றவை)
2. **Manifest agent** -- Dependency files படிக்கிறது (`deno.json`, `package.json`, `tsconfig.json`), dependencies, scripts, மற்றும் entry points பட்டியலிடுகிறது
3. **Pattern agent** -- Coding patterns detect செய்ய source files sample செய்கிறது: module structure, error handling, type conventions, import style, naming, testing
4. **Focus agent** -- Focus query தொடர்பான files மற்றும் patterns தேடுகிறது
5. **Import agent** (deep மட்டும்) -- Entry points இலிருந்து import graphs trace செய்கிறது, circular dependencies கண்டறிகிறது
6. **Git agent** (deep மட்டும்) -- Recent commits, current branch, uncommitted changes analyze செய்கிறது

அனைத்து agents உம் concurrently இயங்குகின்றன. Results ஒரு structured `ExploreResult` ஆக assembled ஆகின்றன:

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

## Agent எப்போது பயன்படுத்துகிறது

இந்த situations இல் `explore` பயன்படுத்த agent instructed ஆகிறது:

- Unfamiliar code திருத்துவதற்கு முன்பு
- "இது என்ன செய்கிறது" அல்லது "இது எவ்வாறு structured" என்று கேட்கும்போது
- Existing code சேர்ந்த non-trivial task இன் தொடக்கத்தில்
- Follow செய்ய சரியான file அல்லது pattern கண்டுபிடிக்க வேண்டும்போது

Explore செய்த பிறகு, agent புதிய code எழுதும்போது அது கண்டுபிடித்த patterns மற்றும் conventions ஐ reference செய்கிறது, existing codebase உடன் consistency உறுதிப்படுத்துகிறது.

## எடுத்துக்காட்டுகள்

```
# ஒரு directory இன் quick overview
explore({ path: "src/auth" })

# Specific patterns க்கு focused search
explore({ path: "src/auth", focus: "how tokens are validated" })

# git history மற்றும் import graphs சேர்ந்த Deep analysis
explore({ path: "src/core", depth: "deep" })

# Tests எழுதுவதற்கு முன்பு test conventions புரிந்துகொள்ளவும்
explore({ path: "tests/", focus: "test patterns and assertions" })
```
