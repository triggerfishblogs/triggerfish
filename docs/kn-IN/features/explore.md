# Codebase ಅನ್ವೇಷಣೆ

`explore` tool agent ಗೆ codebases ಮತ್ತು directories ತ್ವರಿತ, ರಚನಾತ್ಮಕ ತಿಳಿವಳಿಕೆ
ನೀಡುತ್ತದೆ. `read_file`, `list_directory`, ಮತ್ತು `search_files` ಅನ್ನು ಅನುಕ್ರಮವಾಗಿ
ಕರೆಯುವ ಬದಲು, agent `explore` ಒಮ್ಮೆ call ಮಾಡಿ parallel sub-agents ನಿಂದ ರಚಿತ
ರಚನಾತ್ಮಕ ವರದಿ ಪಡೆಯುತ್ತದೆ.

## Tool

### `explore`

Directory ಅಥವಾ codebase ಅನ್ವೇಷಿಸಿ ರಚನೆ, patterns, ಮತ್ತು conventions ಅರ್ಥಮಾಡಿಕೊಳ್ಳಿ.
Read-only.

| Parameter | Type   | Required | Description                                               |
| --------- | ------ | -------- | --------------------------------------------------------- |
| `path`    | string | yes      | Explore ಮಾಡಬೇಕಾದ directory ಅಥವಾ ಫೈಲ್                   |
| `focus`   | string | no       | ಏನನ್ನು ಹುಡುಕಬೇಕು (ಉದಾ. "auth patterns", "test structure") |
| `depth`   | string | no       | ಎಷ್ಟು ಆಳವಾಗಿ: `shallow`, `standard` (ಡಿಫಾಲ್ಟ್), ಅಥವಾ `deep`  |

## Depth ಮಟ್ಟಗಳು

| Depth      | Agents Spawned | ಏನನ್ನು ವಿಶ್ಲೇಷಿಸಲ್ಪಡುತ್ತದೆ                                      |
| ---------- | -------------- | --------------------------------------------------------------- |
| `shallow`  | 2              | Directory tree + dependency manifests                           |
| `standard` | 3-4            | Tree + manifests + code patterns + focus (ನಿರ್ದಿಷ್ಟಪಡಿಸಿದ್ದರೆ) |
| `deep`     | 5-6            | ಮೇಲಿನ ಎಲ್ಲ + import graph tracing + git history                 |

## ಇದು ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ

Explore tool ಸಮಾನಾಂತರ sub-agents spawn ಮಾಡುತ್ತದೆ, ಪ್ರತಿಯೊಂದು ಭಿನ್ನ ಅಂಶದ ಮೇಲೆ
ಕೇಂದ್ರೀಕರಿಸುತ್ತದೆ:

1. **Tree agent** -- Directory ರಚನೆ ನಕ್ಷೆ ಮಾಡುತ್ತದೆ (3 ಮಟ್ಟ ಆಳ), ಸಂಪ್ರದಾಯದ ಮೂಲಕ
   ಮುಖ್ಯ ಫೈಲ್‌ಗಳನ್ನು ಗುರುತಿಸುತ್ತದೆ (`mod.ts`, `main.ts`, `deno.json`, `README.md`, ಇತ್ಯಾದಿ)
2. **Manifest agent** -- Dependency files ಓದುತ್ತದೆ (`deno.json`, `package.json`,
   `tsconfig.json`), dependencies, scripts, ಮತ್ತು entry points ಪಟ್ಟಿ ಮಾಡುತ್ತದೆ
3. **Pattern agent** -- Source files sample ಮಾಡಿ coding patterns ಪತ್ತೆ ಮಾಡುತ್ತದೆ:
   module ರಚನೆ, error handling, type conventions, import style, naming, testing
4. **Focus agent** -- Focus query ಗೆ ಸಂಬಂಧಿತ ಫೈಲ್‌ಗಳು ಮತ್ತು patterns ಹುಡುಕುತ್ತದೆ
5. **Import agent** (deep ಮಾತ್ರ) -- Entry points ನಿಂದ import graphs trace ಮಾಡಿ,
   circular dependencies ಪತ್ತೆ ಹಚ್ಚುತ್ತದೆ
6. **Git agent** (deep ಮಾತ್ರ) -- ಇತ್ತೀಚಿನ commits, ಪ್ರಸ್ತುತ branch, uncommitted
   changes ವಿಶ್ಲೇಷಿಸುತ್ತದೆ

ಎಲ್ಲ agents ಏಕಕಾಲದಲ್ಲಿ ಚಲಿಸುತ್ತವೆ. ಫಲಿತಾಂಶಗಳನ್ನು ರಚನಾತ್ಮಕ `ExploreResult` ಗೆ
ಜೋಡಿಸಲ್ಪಡುತ್ತವೆ:

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

## Agent ಇದನ್ನು ಯಾವಾಗ ಬಳಸುತ್ತದೆ

ಈ situations ನಲ್ಲಿ `explore` ಬಳಸಲು agent ನಿರ್ದೇಶಿಸಲ್ಪಟ್ಟಿದೆ:

- ಅಪರಿಚಿತ code ಮಾರ್ಪಡಿಸುವ ಮೊದಲು
- "ಇದು ಏನು ಮಾಡುತ್ತದೆ" ಅಥವಾ "ಇದು ಹೇಗೆ ರಚಿಸಲ್ಪಟ್ಟಿದೆ" ಎಂದು ಕೇಳಿದಾಗ
- ಅಸ್ತಿತ್ವದಲ್ಲಿರುವ code ಒಳಗೊಂಡ ಯಾವ ಸಾಮಾನ್ಯ ಕಾರ್ಯದ ಆರಂಭದಲ್ಲಿ
- ಸರಿಯಾದ ಫೈಲ್ ಅಥವಾ pattern ಹುಡುಕಬೇಕಾದಾಗ

Explore ಮಾಡಿದ ನಂತರ, agent ಹೊಸ code ಬರೆಯುವಾಗ ಪತ್ತೆ ಮಾಡಿದ patterns ಮತ್ತು
conventions reference ಮಾಡುತ್ತದೆ, ಅಸ್ತಿತ್ವದಲ್ಲಿರುವ codebase ಜೊತೆ ಸಂಗತಿ ಖಾತ್ರಿಪಡಿಸುತ್ತದೆ.

## ಉದಾಹರಣೆಗಳು

```
# Quick overview of a directory
explore({ path: "src/auth" })

# Focused search for specific patterns
explore({ path: "src/auth", focus: "how tokens are validated" })

# Deep analysis including git history and import graphs
explore({ path: "src/core", depth: "deep" })

# Understand test conventions before writing tests
explore({ path: "tests/", focus: "test patterns and assertions" })
```
