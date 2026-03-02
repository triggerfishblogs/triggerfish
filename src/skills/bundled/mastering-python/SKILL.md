---
name: mastering-python
version: 1.0.0
description: >
  Python development patterns for Triggerfish plugins running in the
  Pyodide WASM sandbox. Covers what works in WASM, SDK usage, data
  classification, async patterns, and pure-Python alternatives to
  native libraries. Use when writing Python plugins for Triggerfish.
classification_ceiling: INTERNAL
requires_tools: []
network_domains: []
---

# Mastering Python for Triggerfish Plugins

Python plugins run inside Pyodide (a CPython interpreter compiled to
WebAssembly) inside the Deno sandbox. This is a double-sandbox: WASM inside
Deno. The environment is intentionally constrained for security.

## The Pyodide Runtime

Pyodide is CPython 3.11+ compiled to WASM. Most of the standard library works.
Native C extensions do not.

### What Works

| Category             | Available                                                                                                                                                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Standard library     | `json`, `re`, `datetime`, `collections`, `itertools`, `functools`, `math`, `decimal`, `fractions`, `statistics`, `hashlib`, `hmac`, `base64`, `urllib.parse`, `html`, `csv`, `io`, `textwrap`, `difflib`, `enum`, `dataclasses`, `typing`, `abc`, `copy`, `pprint` |
| Async                | `asyncio` (event loop provided by Pyodide)                                                                                                                                                                                                                         |
| Data structures      | `array`, `heapq`, `bisect`, `queue`, `struct`                                                                                                                                                                                                                      |
| String/text          | `string`, `unicodedata`, `codecs`                                                                                                                                                                                                                                  |
| Pure-Python packages | Installable via `micropip` (Pyodide's package manager)                                                                                                                                                                                                             |

### What Does NOT Work

| Category                    | Why                                        |
| --------------------------- | ------------------------------------------ |
| Native C extensions         | WASM cannot load `.so`/`.dylib` files      |
| `psycopg2`, `mysqlclient`   | C-based database drivers                   |
| `numpy` (partial)           | Pyodide ships a WASM build, but it's heavy |
| `pandas` (partial)          | Works via Pyodide's WASM build, but slow   |
| `os.system()`, `subprocess` | No process spawning in WASM                |
| `socket` (raw)              | No raw socket access                       |
| File I/O to host            | Filesystem is virtual, isolated from host  |
| `multiprocessing`           | No forking in WASM                         |
| `ctypes`, `cffi`            | No native code loading                     |

### Pure-Python Alternatives

| Instead of                     | Use                                               |
| ------------------------------ | ------------------------------------------------- |
| `psycopg2` (PostgreSQL)        | HTTP via PostgREST, Supabase SDK, or Neon API     |
| `mysqlclient` (MySQL)          | HTTP via PlanetScale API                          |
| `pymongo` (MongoDB)            | HTTP via Atlas Data API                           |
| `requests`                     | `pyodide.http.pyfetch()` or `sdk.query_as_user()` |
| `boto3` (AWS)                  | HTTP via AWS REST APIs with SigV4 signing         |
| `pandas` for simple transforms | `csv` + list comprehensions                       |
| `numpy` for basic math         | `math`, `statistics`, `decimal`                   |

## Plugin Structure

A Python plugin is an `async def execute(sdk)` function:

```python
async def execute(sdk):
    """Plugin entry point. Receives the SDK instance."""

    # 1. Check prerequisites
    if not await sdk.has_user_connection("my-service"):
        return {"success": False, "error": "Service not connected"}

    # 2. Fetch data using the user's credentials
    results = await sdk.query_as_user("my-service", {
        "endpoint": "/api/v1/data",
        "method": "GET",
        "params": {"limit": 100}
    })

    # 3. Process data
    summary = process_results(results)

    # 4. Emit classified data back to the agent
    sdk.emit_data({
        "classification": "INTERNAL",
        "payload": summary,
        "source": "my-service"
    })

    return {"success": True}


def process_results(results):
    """Pure function: transform raw API data into a summary."""
    items = results.get("data", [])
    return {
        "total": len(items),
        "categories": group_by_category(items),
    }


def group_by_category(items):
    """Group items by their category field."""
    groups = {}
    for item in items:
        cat = item.get("category", "uncategorized")
        groups.setdefault(cat, []).append(item)
    return groups
```

## SDK Methods

The SDK is injected as the sole argument to `execute()`. All methods are async.

### Data Operations

```python
# Query an external system using the user's delegated credentials
results = await sdk.query_as_user("service-name", {
    "endpoint": "/api/v1/resource",
    "method": "GET",
    "params": {"key": "value"}
})

# Emit data back to the agent — classification is REQUIRED
sdk.emit_data({
    "classification": "CONFIDENTIAL",  # REQUIRED
    "payload": results,
    "source": "service-name"
})
```

### Connection Checks

```python
# Check if the user has connected a service
if await sdk.has_user_connection("github"):
    repos = await sdk.query_as_user("github", {
        "endpoint": "/user/repos"
    })
```

### Credential Access

```python
# Get the user's delegated credential for a service
credential = await sdk.get_user_credential("salesforce")
if credential is None:
    return {"success": False, "error": "Salesforce not connected"}
```

## Classification Rules

Every `emit_data()` call MUST include a classification label:

```python
# This WORKS
sdk.emit_data({"classification": "INTERNAL", "payload": data})

# This FAILS — no classification
sdk.emit_data({"payload": data})  # SDK rejects it

# This FAILS — exceeds plugin ceiling
# (if plugin's max_classification is INTERNAL)
sdk.emit_data({"classification": "RESTRICTED", "payload": data})  # SDK rejects it
```

Choose the lowest classification that fits:

| Level          | When to Use                                                  |
| -------------- | ------------------------------------------------------------ |
| `PUBLIC`       | Publicly available data (weather, stock prices, public APIs) |
| `INTERNAL`     | Internal project data, non-sensitive configs                 |
| `CONFIDENTIAL` | User PII, private messages, API responses with personal data |
| `RESTRICTED`   | Encryption keys, financial records, compliance data          |

## Async Patterns

Pyodide provides an asyncio event loop. Use `async`/`await` for all I/O:

```python
import asyncio

async def execute(sdk):
    # Parallel queries
    github_task = sdk.query_as_user("github", {"endpoint": "/user/repos"})
    jira_task = sdk.query_as_user("jira", {"endpoint": "/rest/api/2/search"})

    github_repos, jira_issues = await asyncio.gather(github_task, jira_task)

    sdk.emit_data({
        "classification": "INTERNAL",
        "payload": {
            "repos": github_repos,
            "issues": jira_issues,
        }
    })

    return {"success": True}
```

## Data Processing Patterns

Since native libraries are unavailable, use standard library for data
transforms:

### JSON Processing

```python
import json

def transform_api_response(raw):
    """Parse and reshape JSON API data."""
    data = json.loads(raw) if isinstance(raw, str) else raw
    return [
        {"id": item["id"], "name": item["name"], "status": item["status"]}
        for item in data.get("results", [])
        if item.get("active", False)
    ]
```

### Date Handling

```python
from datetime import datetime, timedelta

def recent_items(items, hours=24):
    """Filter items created in the last N hours."""
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    return [
        item for item in items
        if datetime.fromisoformat(item["created_at"].rstrip("Z")) > cutoff
    ]
```

### CSV Processing

```python
import csv
import io

def parse_csv_response(csv_text):
    """Parse CSV text into list of dicts."""
    reader = csv.DictReader(io.StringIO(csv_text))
    return list(reader)

def to_csv(records, fields):
    """Convert list of dicts to CSV string."""
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fields)
    writer.writeheader()
    writer.writerows(records)
    return output.getvalue()
```

### Aggregation

```python
from collections import Counter, defaultdict
from statistics import mean, median

def summarize_issues(issues):
    """Aggregate issue data without pandas."""
    by_status = Counter(i["status"] for i in issues)
    by_assignee = defaultdict(list)
    for i in issues:
        by_assignee[i.get("assignee", "unassigned")].append(i)

    ages = [(datetime.utcnow() - datetime.fromisoformat(i["created_at"].rstrip("Z"))).days
            for i in issues]

    return {
        "total": len(issues),
        "by_status": dict(by_status),
        "avg_age_days": round(mean(ages), 1) if ages else 0,
        "median_age_days": round(median(ages), 1) if ages else 0,
        "top_assignees": {k: len(v) for k, v in sorted(
            by_assignee.items(), key=lambda x: -len(x[1])
        )[:5]},
    }
```

## HTTP Requests in Pyodide

For direct HTTP calls (when not using `sdk.query_as_user()`), Pyodide provides
`pyfetch`:

```python
from pyodide.http import pyfetch

async def fetch_json(url, headers=None):
    """Fetch JSON from a URL (must be in declared endpoints)."""
    response = await pyfetch(url, headers=headers or {})
    return await response.json()
```

The sandbox enforces the declared endpoints allowlist. Requests to undeclared
domains are blocked.

## Error Handling

Return error dicts from `execute()`. Never raise unhandled exceptions:

```python
async def execute(sdk):
    try:
        results = await sdk.query_as_user("analytics", {
            "endpoint": "/api/metrics"
        })
    except Exception as e:
        return {"success": False, "error": f"Query failed: {e}"}

    if not results.get("data"):
        return {"success": False, "error": "No data returned"}

    sdk.emit_data({
        "classification": "INTERNAL",
        "payload": results["data"]
    })

    return {"success": True}
```

## Testing Python Plugins

Test plugin logic as pure functions outside the sandbox:

```python
# test_plugin.py
from plugin import process_results, group_by_category

def test_group_by_category():
    items = [
        {"name": "a", "category": "bug"},
        {"name": "b", "category": "feature"},
        {"name": "c", "category": "bug"},
    ]
    groups = group_by_category(items)
    assert len(groups["bug"]) == 2
    assert len(groups["feature"]) == 1

def test_process_results_empty():
    result = process_results({"data": []})
    assert result["total"] == 0
```

Extract business logic into pure functions. Test those functions. The
`execute()` function is just glue between SDK calls and logic.

## Common Mistakes

| Mistake                                    | Fix                                                   |
| ------------------------------------------ | ----------------------------------------------------- |
| Importing `requests`                       | Use `sdk.query_as_user()` or `pyodide.http.pyfetch()` |
| Importing `psycopg2` or `pymongo`          | Use HTTP-based database APIs                          |
| Forgetting classification on `emit_data()` | Always include `"classification"` key                 |
| Using `open()` for file I/O                | Filesystem is virtual; use in-memory `io.StringIO`    |
| Blocking I/O in async function             | Use `await` for all I/O operations                    |
| Catching `Exception` silently              | Log or return the error message                       |
| Using `subprocess` or `os.system()`        | Not available in WASM; use SDK methods                |
| Heavy `numpy`/`pandas` for simple tasks    | Use `statistics`, `collections`, list comprehensions  |
