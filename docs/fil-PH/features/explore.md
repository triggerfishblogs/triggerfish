# Codebase Exploration

Ang `explore` tool ay nagbibigay sa agent ng mabilis at structured na pag-unawa sa mga codebase at directories. Sa halip na manu-manong tawagin ang `read_file`, `list_directory`, at `search_files` nang sunod-sunod, isang beses lang tatawag ang agent ng `explore` at makakakuha ng structured report na ginawa ng parallel sub-agents.

## Tool

### `explore`

Mag-explore ng directory o codebase para maunawaan ang structure, patterns, at conventions. Read-only.

| Parameter | Type   | Required | Paglalarawan                                                     |
| --------- | ------ | -------- | ---------------------------------------------------------------- |
| `path`    | string | yes      | Directory o file na ie-explore                                   |
| `focus`   | string | no       | Ano ang hahanapin (hal. "auth patterns", "test structure")       |
| `depth`   | string | no       | Gaano kathoroughly: `shallow`, `standard` (default), o `deep`    |

## Mga Depth Level

| Depth      | Agents na Sine-spawn | Ano ang Ina-analyze                                        |
| ---------- | -------------------- | ---------------------------------------------------------- |
| `shallow`  | 2                    | Directory tree + dependency manifests                      |
| `standard` | 3-4                  | Tree + manifests + code patterns + focus (kung specified)  |
| `deep`     | 5-6                  | Lahat ng nasa itaas + import graph tracing + git history   |

## Paano Gumagana

Nagsi-spawn ng parallel sub-agents ang explore tool, bawat isa ay nakapokus sa ibang facet:

1. **Tree agent** -- Nima-map ang directory structure (3 levels deep), kinikilala ang key files ayon sa convention (`mod.ts`, `main.ts`, `deno.json`, `README.md`, atbp.)
2. **Manifest agent** -- Binabasa ang dependency files (`deno.json`, `package.json`, `tsconfig.json`), nili-list ang dependencies, scripts, at entry points
3. **Pattern agent** -- Nagsa-sample ng source files para ma-detect ang coding patterns: module structure, error handling, type conventions, import style, naming, testing
4. **Focus agent** -- Naghahanap ng files at patterns na may kinalaman sa focus query
5. **Import agent** (deep lang) -- Tina-trace ang import graphs mula sa entry points, dine-detect ang circular dependencies
6. **Git agent** (deep lang) -- Ina-analyze ang recent commits, current branch, uncommitted changes

Lahat ng agents ay tumatakbo nang sabay-sabay. Ang results ay ina-assemble sa structured `ExploreResult`:

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

## Kailan Ginagamit ng Agent

Ini-instruct ang agent na gamitin ang `explore` sa mga ganitong sitwasyon:

- Bago mag-modify ng hindi pamilyar na code
- Kapag tinanong ng "what does this do" o "how is this structured"
- Sa simula ng anumang non-trivial task na may kinalaman sa existing code
- Kapag kailangan nitong hanapin ang tamang file o pattern na susundin

Pagkatapos mag-explore, nire-reference ng agent ang mga patterns at conventions na natagpuan nito kapag nagsusulat ng bagong code, para matiyak ang consistency sa existing codebase.

## Mga Halimbawa

```
# Mabilis na overview ng isang directory
explore({ path: "src/auth" })

# Focused search para sa specific patterns
explore({ path: "src/auth", focus: "how tokens are validated" })

# Deep analysis kasama ang git history at import graphs
explore({ path: "src/core", depth: "deep" })

# Unawain ang test conventions bago magsulat ng tests
explore({ path: "tests/", focus: "test patterns and assertions" })
```
