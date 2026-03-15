# Codebase Exploration

`explore` tool एजंटला codebases आणि directories ची fast, structured समज देतो.
Manually `read_file`, `list_directory`, आणि `search_files` sequence मध्ये call
करण्याऐवजी, एजंट एकदा `explore` call करतो आणि parallel sub-agents द्वारे
तयार केलेला structured report मिळवतो.

## Tool

### `explore`

Structure, patterns, आणि conventions समजण्यासाठी directory किंवा codebase
explore करा. Read-only.

| Parameter | Type   | Required | वर्णन                                                             |
| --------- | ------ | -------- | ----------------------------------------------------------------- |
| `path`    | string | हो       | Explore करायची directory किंवा file                               |
| `focus`   | string | नाही     | काय शोधायचे (उदा. "auth patterns", "test structure")              |
| `depth`   | string | नाही     | किती thorough: `shallow`, `standard` (default), किंवा `deep`     |

## Depth Levels

| Depth      | Agents Spawned | काय Analyzed केले जाते                                  |
| ---------- | -------------- | ------------------------------------------------------- |
| `shallow`  | 2              | Directory tree + dependency manifests                   |
| `standard` | 3-4            | Tree + manifests + code patterns + focus (if specified) |
| `deep`     | 5-6            | Everything above + import graph tracing + git history   |

## हे कसे काम करते

Explore tool parallel sub-agents spawn करतो, प्रत्येक वेगळ्या facet वर focused:

1. **Tree agent** -- Directory structure map करतो (3 levels deep), convention
   द्वारे key files identify करतो (`mod.ts`, `main.ts`, `deno.json`, `README.md`, इ.)
2. **Manifest agent** -- Dependency files (`deno.json`, `package.json`,
   `tsconfig.json`) वाचतो, dependencies, scripts, आणि entry points list करतो
3. **Pattern agent** -- Coding patterns detect करण्यासाठी source files sample
   करतो: module structure, error handling, type conventions, import style, naming,
   testing
4. **Focus agent** -- Focus query शी related files आणि patterns शोधतो
5. **Import agent** (deep only) -- Entry points वरून import graphs trace करतो,
   circular dependencies detect करतो
6. **Git agent** (deep only) -- Recent commits, current branch, uncommitted
   changes analyze करतो

सर्व agents concurrently run होतात. Results structured `ExploreResult` मध्ये
assembled केले जातात:

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

## एजंट केव्हा ते वापरतो

एजंटला या situations मध्ये `explore` वापरण्याचे instructed आहे:

- Unfamiliar code modify करण्यापूर्वी
- "हे काय करते" किंवा "हे कसे structured आहे" असे विचारल्यावर
- Existing code involving कोणत्याही non-trivial task च्या सुरुवातीला
- Follow करायला right file किंवा pattern शोधणे आवश्यक असताना

Explore केल्यानंतर, एजंट नवीन code लिहिताना त्याला मिळालेले patterns आणि
conventions reference करतो, existing codebase शी consistency सुनिश्चित करतो.

## Examples

```
# Directory चे quick overview
explore({ path: "src/auth" })

# Specific patterns साठी focused search
explore({ path: "src/auth", focus: "how tokens are validated" })

# Git history आणि import graphs सह deep analysis
explore({ path: "src/core", depth: "deep" })

# Tests लिहिण्यापूर्वी test conventions समजा
explore({ path: "tests/", focus: "test patterns and assertions" })
```
