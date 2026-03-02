---
name: deep-research
version: 1.0.0
description: >
  Multi-step autonomous research. Decomposes topics into search queries,
  fetches and analyzes sources, identifies gaps, refines queries, and
  synthesizes structured reports with inline citations.
classification_ceiling: CONFIDENTIAL
requires_tools:
  - web_search
  - web_fetch
  - llm_task
network_domains:
---

# Deep Research Methodology

You are now in deep research mode. Follow this methodology exactly — do not skip
steps or reduce the number of searches/fetches below the minimums specified.

## Step 0: Select Depth

Based on the user's wording, select a depth level. If unclear, default to
Standard.

| Depth    | Min Sources to Fetch | Min Search Queries | Refinement Rounds | Trigger Words                                                 |
| -------- | -------------------- | ------------------ | ----------------- | ------------------------------------------------------------- |
| Quick    | 5                    | 3                  | 1                 | "look into", "quick research", brief questions                |
| Standard | 10                   | 8                  | 2                 | "research", "report on", default for any research request     |
| Deep     | 20                   | 15                 | 3                 | "thorough", "comprehensive", "deep dive", "detailed analysis" |

## Step 1: Generate Search Queries

Use `llm_task` to decompose the topic into diverse search queries:

```
llm_task: "Given the research topic '{topic}', generate exactly {N} specific search queries that cover different facets, angles, and perspectives. Include queries for: definitions, recent developments, expert opinions, counterarguments, statistics/data, and real-world examples. Return ONLY a JSON array of strings, nothing else."
```

Where {N} is the "Min Search Queries" from the depth table above.

## Step 2: Execute ALL Search Queries

Call `web_search` for EVERY query from Step 1. Do not stop after one search. You
must execute all {N} queries.

**You can call multiple `web_search` tools in a single turn — do this to work
efficiently.** For example, at Standard depth, call `web_search` 8 times in a
single response.

After all searches complete, collect all unique URLs. Deduplicate by domain —
keep at most 2 URLs per domain to ensure source diversity.

## Step 3: Fetch Sources

Call `web_fetch` on the top URLs from your deduplicated list. You MUST fetch at
least the "Min Sources to Fetch" number from the depth table.

**Call multiple `web_fetch` tools in a single turn for efficiency.** For
Standard depth, fetch 10 URLs in one batch (or split across two turns if
needed).

If a fetch fails, skip it and fetch the next URL. Do NOT stop the research
because one fetch failed.

## Step 4: Analyze Each Source

Use `llm_task` to extract findings from EACH fetched source individually:

```
llm_task: "Extract key findings from this content related to '{topic}'. Content: {fetched_content}. Return structured JSON: { findings: [{ fact: string, confidence: 'high'|'medium'|'low', source_url: string }] }"
```

You may batch multiple `llm_task` calls in a single turn.

## Step 5: Gap Analysis and Refinement

Use `llm_task` to identify gaps in your findings:

```
llm_task: "Given these findings about '{topic}': {all_findings_summary}. What important aspects are still missing or underrepresented? Generate {M} follow-up search queries to fill these gaps. Return ONLY a JSON array of strings."
```

Then repeat Steps 2-4 with the follow-up queries. Do this for the number of
"Refinement Rounds" specified by the depth level.

## Step 6: Synthesize Report

After all rounds are complete, write the final report directly (do NOT use
llm_task for the final synthesis — write it yourself so you can use the full
conversation context).

## Output Format

Structure your report exactly as follows:

### Executive Summary

2-3 sentences capturing the key takeaway.

### Key Findings

Numbered findings with inline citations like [1], [2] referencing the Sources
list.

### Analysis

Deeper discussion: patterns, areas of consensus, areas of disagreement,
surprising discoveries.

### Sources

Numbered list of ALL URLs you fetched, with a one-line description of each.

## Rules

- You MUST execute the minimum number of searches and fetches for the selected
  depth. Doing fewer is a failure.
- Always cite sources with inline [N] references.
- Note when sources disagree with each other.
- Flag low-confidence findings explicitly.
- If you cannot find enough information, say so — never fabricate.
- All fetched content inherits session taint automatically.
- Call multiple tools per turn whenever possible to stay within iteration
  limits.
