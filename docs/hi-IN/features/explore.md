# कोडबेस अन्वेषण

`explore` tool agent को codebases और directories की तेज़, संरचित समझ प्रदान करता
है। मैन्युअल रूप से `read_file`, `list_directory`, और `search_files` को क्रम में
कॉल करने के बजाय, agent एक बार `explore` कॉल करता है और समानांतर sub-agents द्वारा
तैयार एक संरचित रिपोर्ट वापस पाता है।

## Tool

### `explore`

एक directory या codebase का अन्वेषण करें ताकि संरचना, पैटर्न, और परंपराओं को
समझा जा सके। केवल-पठन।

| Parameter | Type   | आवश्यक | विवरण                                                     |
| --------- | ------ | ------ | --------------------------------------------------------- |
| `path`    | string | हाँ    | अन्वेषण करने के लिए directory या फ़ाइल                      |
| `focus`   | string | नहीं   | क्या खोजना है (जैसे "auth patterns", "test structure")     |
| `depth`   | string | नहीं   | कितनी गहराई: `shallow`, `standard` (डिफ़ॉल्ट), या `deep`   |

## Depth स्तर

| Depth      | बनाए गए Agents | क्या विश्लेषित होता है                                        |
| ---------- | -------------- | ------------------------------------------------------------- |
| `shallow`  | 2              | Directory tree + dependency manifests                          |
| `standard` | 3-4            | Tree + manifests + code patterns + focus (यदि निर्दिष्ट)       |
| `deep`     | 5-6            | ऊपर सब + import graph tracing + git इतिहास                     |

## यह कैसे काम करता है

Explore tool समानांतर sub-agents बनाता है, प्रत्येक एक अलग पहलू पर केंद्रित:

1. **Tree agent** -- Directory संरचना (3 स्तर गहरी) मैप करता है, परंपरा के
   अनुसार मुख्य फ़ाइलों की पहचान करता है (`mod.ts`, `main.ts`, `deno.json`,
   `README.md`, आदि)
2. **Manifest agent** -- Dependency फ़ाइलें (`deno.json`, `package.json`,
   `tsconfig.json`) पढ़ता है, dependencies, scripts, और entry points सूचीबद्ध
   करता है
3. **Pattern agent** -- Coding patterns का पता लगाने के लिए source फ़ाइलों के
   नमूने लेता है: module संरचना, error handling, type परंपराएँ, import शैली,
   नामकरण, testing
4. **Focus agent** -- Focus query से संबंधित फ़ाइलों और patterns की खोज करता है
5. **Import agent** (केवल deep) -- Entry points से import graphs ट्रेस करता है,
   circular dependencies का पता लगाता है
6. **Git agent** (केवल deep) -- हाल के commits, वर्तमान branch, uncommitted
   परिवर्तनों का विश्लेषण करता है

सभी agents समवर्ती रूप से चलते हैं। परिणाम एक संरचित `ExploreResult` में
संयोजित होते हैं:

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

## Agent कब इसका उपयोग करता है

Agent को इन स्थितियों में `explore` उपयोग करने का निर्देश दिया जाता है:

- अपरिचित कोड संशोधित करने से पहले
- जब पूछा जाए "यह क्या करता है" या "यह कैसे संरचित है"
- मौजूदा कोड शामिल किसी भी गैर-तुच्छ कार्य की शुरुआत में
- जब उसे सही फ़ाइल या अनुसरण करने का पैटर्न खोजने की आवश्यकता होती है

अन्वेषण के बाद, agent नया कोड लिखते समय पाए गए patterns और परंपराओं का संदर्भ
देता है, मौजूदा codebase के साथ स्थिरता सुनिश्चित करता है।

## उदाहरण

```
# एक directory का त्वरित अवलोकन
explore({ path: "src/auth" })

# विशिष्ट patterns की केंद्रित खोज
explore({ path: "src/auth", focus: "how tokens are validated" })

# Git इतिहास और import graphs सहित गहन विश्लेषण
explore({ path: "src/core", depth: "deep" })

# Tests लिखने से पहले test परंपराएँ समझें
explore({ path: "tests/", focus: "test patterns and assertions" })
```
