---
name: deep-research
description: >
  Multi-step autonomous research. Decomposes topics into search queries,
  fetches and analyzes sources, identifies gaps, refines queries, and
  synthesizes structured reports with inline citations.
classification_ceiling: CONFIDENTIAL
requires_tools:
  - web_search
  - web_fetch
  - llm_task
network_domains: []
---

# Deep Research Methodology

You have the ability to conduct thorough, multi-step research on any topic. When the user asks you to research something (indicated by words like "research", "investigate", "deep dive", "comprehensive analysis", "report on", or when a question clearly requires consulting multiple sources), follow this methodology.

## When to Use Deep Research

- User explicitly asks for research or a report
- Question requires synthesizing multiple sources
- Topic is complex enough that a single search won't suffice
- User asks for "thorough", "comprehensive", or "detailed" analysis

Do NOT use deep research for simple factual questions that web_search can answer directly.

## Depth Selection

| Depth | Sources | Initial Queries | Refinement Rounds | When to Use |
|-------|---------|----------------|-------------------|-------------|
| Quick | 5 | 3 | 1 | "look into X", brief questions |
| Standard | 10 | 8 | 2 | "research X", default depth |
| Deep | 20 | 15 | 3 | "thorough analysis", "comprehensive report" |

## Research Loop

### Phase 1: Planning

Decompose the topic into specific search queries. Use `llm_task` to generate a research plan if complex:

```
llm_task: "Given the research topic '{topic}', generate {N} specific search queries
that cover different facets. Return as a JSON array of strings."
```

### Phase 2: Searching

Execute each query via `web_search`. Collect URLs. Deduplicate by domain — prefer source diversity.

### Phase 3: Fetching

Use `web_fetch` on top N URLs (based on depth). Prioritize original sources, reputable publications, recent content. Skip errors — don't stop the whole research if one fetch fails.

### Phase 4: Analyzing

Use `llm_task` to extract findings from each source:

```
llm_task: "Extract key findings from this content related to '{topic}'.
Return structured JSON: { findings: [{ fact: string, confidence: 'high'|'medium'|'low', source_url: string }] }"
```

### Phase 5: Gap Analysis

Use `llm_task` to identify what's missing and generate follow-up queries:

```
llm_task: "Given these findings about '{topic}': {findings_summary}
What important aspects are missing? Generate {M} follow-up search queries. Return as JSON array."
```

Repeat Phases 2-4 for each refinement round.

### Phase 6: Synthesis

Produce a structured report with `llm_task`:

```
llm_task: "Synthesize these findings into a structured report about '{topic}'.
Include: executive summary, key findings with inline citations [1] [2], areas of consensus,
areas of disagreement, and a sources list."
```

## Output Format

### Executive Summary
2-3 sentences capturing the key takeaway.

### Key Findings
Numbered findings with inline citations referencing the sources list.

### Analysis
Deeper discussion of patterns, disagreements, or surprising findings.

### Sources
Numbered list of all URLs consulted with brief descriptions.

## Important Rules

- Always cite sources with inline references
- Note when sources disagree
- Flag low-confidence findings
- If insufficient coverage, say so — don't fabricate
- Respect rate limits: space web_fetch calls
- All fetched content inherits session taint automatically
