/**
 * Tests for LLM provider connection verification.
 *
 * Uses injected mock fetchers — no real network calls.
 */
import { assertEquals, assertStringIncludes } from "@std/assert";
import { verifyProvider } from "../../src/dive/verify.ts";

// ─── Mock fetcher helpers ────────────────────────────────────────────────────

/** OpenAI-compatible model list body. */
function openaiModelList(ids: ReadonlyArray<string>): string {
  return JSON.stringify({ object: "list", data: ids.map((id) => ({ id, object: "model" })) });
}

/** Google model list body. */
function googleModelList(names: ReadonlyArray<string>): string {
  return JSON.stringify({ models: names.map((n) => ({ name: `models/${n}` })) });
}

/** Create a mock fetcher that returns a JSON body with the given status. */
function mockFetcher(status: number, body?: string): typeof fetch {
  return (_url: string | URL | Request, _init?: RequestInit): Promise<Response> => {
    return Promise.resolve(new Response(body ?? null, { status }));
  };
}

/** Mock fetcher returning 200 with an OpenAI-compatible model list. */
function modelFetcher(ids: ReadonlyArray<string>): typeof fetch {
  return mockFetcher(200, openaiModelList(ids));
}

/** Mock fetcher returning 200 with a Google model list. */
function googleFetcher(names: ReadonlyArray<string>): typeof fetch {
  return mockFetcher(200, googleModelList(names));
}

/** Create a mock fetcher that throws a TypeError (network error). */
function networkErrorFetcher(): typeof fetch {
  return (_url: string | URL | Request, _init?: RequestInit): Promise<Response> => {
    return Promise.reject(new TypeError("Failed to fetch"));
  };
}

/** Create a mock fetcher that throws a DOMException (timeout). */
function timeoutFetcher(): typeof fetch {
  return (_url: string | URL | Request, _init?: RequestInit): Promise<Response> => {
    return Promise.reject(new DOMException("The operation was aborted", "TimeoutError"));
  };
}

/**
 * Create a mock fetcher that captures the request URL and headers.
 * Returns 200 with a model list containing the given model ID.
 */
function capturingFetcher(modelId = "some-model"): {
  fetcher: typeof fetch;
  readonly captured: { url: string; headers: Record<string, string> };
} {
  const captured = { url: "", headers: {} as Record<string, string> };
  const fetcher = (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    captured.url = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;
    if (init?.headers) {
      const h = init.headers;
      if (h instanceof Headers) {
        h.forEach((v, k) => {
          captured.headers[k] = v;
        });
      } else if (Array.isArray(h)) {
        for (const [k, v] of h) {
          captured.headers[k] = v;
        }
      } else {
        Object.assign(captured.headers, h);
      }
    }
    return Promise.resolve(
      new Response(openaiModelList([modelId]), { status: 200 }),
    );
  };
  return { fetcher, captured };
}

// ─── Success ─────────────────────────────────────────────────────────────────

Deno.test("Verify: successful verification with matching model returns ok=true", async () => {
  const result = await verifyProvider(
    "anthropic", "sk-test-key", "claude-sonnet-4-5", undefined,
    modelFetcher(["claude-sonnet-4-5", "claude-opus-4"]),
  );
  assertEquals(result.ok, true);
  assertEquals(result.error, undefined);
});

// ─── Model not found ─────────────────────────────────────────────────────────

Deno.test("Verify: model not in list returns error with available models", async () => {
  const result = await verifyProvider(
    "openai", "sk-test", "gpt-5-turbo", undefined,
    modelFetcher(["gpt-4o", "gpt-4o-mini", "gpt-4"]),
  );
  assertEquals(result.ok, false);
  assertStringIncludes(result.error!, "gpt-5-turbo");
  assertStringIncludes(result.error!, "was not found");
  assertStringIncludes(result.error!, "gpt-4o");
});

Deno.test("Verify: Ollama llama3 matches llama3:latest in list", async () => {
  const result = await verifyProvider(
    "ollama", "", "llama3", "http://localhost:11434",
    modelFetcher(["llama3:latest", "mistral:latest"]),
  );
  assertEquals(result.ok, true);
});

Deno.test("Verify: Ollama exact tag match works", async () => {
  const result = await verifyProvider(
    "ollama", "", "llama3:latest", "http://localhost:11434",
    modelFetcher(["llama3:latest", "mistral:latest"]),
  );
  assertEquals(result.ok, true);
});

Deno.test("Verify: Ollama model not found returns error", async () => {
  const result = await verifyProvider(
    "ollama", "", "nonexistent", "http://localhost:11434",
    modelFetcher(["llama3:latest", "mistral:latest"]),
  );
  assertEquals(result.ok, false);
  assertStringIncludes(result.error!, "nonexistent");
  assertStringIncludes(result.error!, "was not found");
});

Deno.test("Verify: Google model name matched without models/ prefix", async () => {
  const result = await verifyProvider(
    "google", "AIza-key", "gemini-2.0-flash", undefined,
    googleFetcher(["gemini-2.0-flash", "gemini-1.5-pro"]),
  );
  assertEquals(result.ok, true);
});

Deno.test("Verify: Google model not found returns error", async () => {
  const result = await verifyProvider(
    "google", "AIza-key", "gemini-99", undefined,
    googleFetcher(["gemini-2.0-flash", "gemini-1.5-pro"]),
  );
  assertEquals(result.ok, false);
  assertStringIncludes(result.error!, "gemini-99");
  assertStringIncludes(result.error!, "was not found");
});

Deno.test("Verify: empty model list skips model check (ok=true)", async () => {
  const result = await verifyProvider(
    "anthropic", "sk-test", "claude-sonnet-4-5", undefined,
    mockFetcher(200, JSON.stringify({ data: [] })),
  );
  assertEquals(result.ok, true);
});

// ─── Auth failure ────────────────────────────────────────────────────────────

Deno.test("Verify: HTTP 401 returns auth error", async () => {
  const result = await verifyProvider("openai", "bad-key", "gpt-4o", undefined, mockFetcher(401));
  assertEquals(result.ok, false);
  assertEquals(result.error, "API key was not accepted. Check that your key is correct and active.");
});

Deno.test("Verify: HTTP 403 returns auth error", async () => {
  const result = await verifyProvider("openai", "bad-key", "gpt-4o", undefined, mockFetcher(403));
  assertEquals(result.ok, false);
  assertEquals(result.error, "API key was not accepted. Check that your key is correct and active.");
});

// ─── Network error ───────────────────────────────────────────────────────────

Deno.test("Verify: network unreachable returns connection error", async () => {
  const result = await verifyProvider("anthropic", "sk-test", "claude-sonnet-4-5", undefined, networkErrorFetcher());
  assertEquals(result.ok, false);
  assertEquals(
    result.error,
    "Could not reach https://api.anthropic.com/v1/models. Check the address and your internet connection.",
  );
});

// ─── Timeout ─────────────────────────────────────────────────────────────────

Deno.test("Verify: timeout returns timeout error", async () => {
  const result = await verifyProvider("openai", "sk-test", "gpt-4o", undefined, timeoutFetcher());
  assertEquals(result.ok, false);
  assertEquals(
    result.error,
    "Connection timed out reaching https://api.openai.com/v1/models.",
  );
});

// ─── Other HTTP error ────────────────────────────────────────────────────────

Deno.test("Verify: HTTP 500 returns generic server error", async () => {
  const result = await verifyProvider("anthropic", "sk-test", "claude-sonnet-4-5", undefined, mockFetcher(500));
  assertEquals(result.ok, false);
  assertEquals(result.error, "Server returned an error (HTTP 500).");
});

Deno.test("Verify: HTTP 429 returns generic server error", async () => {
  const result = await verifyProvider("openrouter", "sk-test", "some-model", undefined, mockFetcher(429));
  assertEquals(result.ok, false);
  assertEquals(result.error, "Server returned an error (HTTP 429).");
});

// ─── Local provider endpoint ─────────────────────────────────────────────────

Deno.test("Verify: local provider uses custom endpoint URL", async () => {
  const { fetcher, captured } = capturingFetcher("llama3:latest");
  await verifyProvider("ollama", "", "llama3", "http://192.168.1.50:11434", fetcher);
  assertEquals(captured.url, "http://192.168.1.50:11434/v1/models");
});

Deno.test("Verify: local provider network error shows endpoint in message", async () => {
  const result = await verifyProvider(
    "ollama", "", "llama3", "http://192.168.1.50:11434",
    networkErrorFetcher(),
  );
  assertEquals(result.ok, false);
  assertEquals(
    result.error,
    "Could not reach http://192.168.1.50:11434. Check the address and your internet connection.",
  );
});

// ─── Provider-specific auth headers ──────────────────────────────────────────

Deno.test("Verify: Anthropic sends x-api-key and anthropic-version headers", async () => {
  const { fetcher, captured } = capturingFetcher("claude-sonnet-4-5");
  await verifyProvider("anthropic", "sk-ant-key", "claude-sonnet-4-5", undefined, fetcher);
  assertEquals(captured.url, "https://api.anthropic.com/v1/models");
  assertEquals(captured.headers["x-api-key"], "sk-ant-key");
  assertEquals(captured.headers["anthropic-version"], "2023-06-01");
});

Deno.test("Verify: OpenAI sends Bearer auth header", async () => {
  const { fetcher, captured } = capturingFetcher("gpt-4o");
  await verifyProvider("openai", "sk-openai-key", "gpt-4o", undefined, fetcher);
  assertEquals(captured.url, "https://api.openai.com/v1/models");
  assertEquals(captured.headers["Authorization"], "Bearer sk-openai-key");
});

Deno.test("Verify: Google passes key as query parameter", async () => {
  const { fetcher, captured } = capturingFetcher("gemini-2.0-flash");
  await verifyProvider("google", "AIza-google-key", "gemini-2.0-flash", undefined, fetcher);
  assertEquals(
    captured.url,
    "https://generativelanguage.googleapis.com/v1beta/models?key=AIza-google-key",
  );
  assertEquals(captured.headers["Authorization"], undefined);
});

Deno.test("Verify: OpenRouter sends Bearer auth header", async () => {
  const { fetcher, captured } = capturingFetcher("anthropic/claude-sonnet-4-5");
  await verifyProvider("openrouter", "sk-or-key", "anthropic/claude-sonnet-4-5", undefined, fetcher);
  assertEquals(captured.url, "https://openrouter.ai/api/v1/models");
  assertEquals(captured.headers["Authorization"], "Bearer sk-or-key");
});

Deno.test("Verify: ZenMux sends Bearer auth header", async () => {
  const { fetcher, captured } = capturingFetcher("openai/gpt-5");
  await verifyProvider("zenmux", "zm-key", "openai/gpt-5", undefined, fetcher);
  assertEquals(captured.url, "https://zenmux.ai/api/v1/models");
  assertEquals(captured.headers["Authorization"], "Bearer zm-key");
});

Deno.test("Verify: Z.AI sends Bearer auth header", async () => {
  const { fetcher, captured } = capturingFetcher("glm-4.7");
  await verifyProvider("zai", "zai-key", "glm-4.7", undefined, fetcher);
  assertEquals(captured.url, "https://api.z.ai/api/coding/paas/v4/models");
  assertEquals(captured.headers["Authorization"], "Bearer zai-key");
});

Deno.test("Verify: local provider sends no auth headers", async () => {
  const { fetcher, captured } = capturingFetcher("llama3:latest");
  await verifyProvider("ollama", "", "llama3", "http://localhost:11434", fetcher);
  assertEquals(captured.headers["Authorization"], undefined);
  assertEquals(captured.headers["x-api-key"], undefined);
});

// ─── LM Studio ──────────────────────────────────────────────────────────────

Deno.test("Verify: LM Studio exact model match works", async () => {
  const result = await verifyProvider(
    "lmstudio", "", "lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF", "http://localhost:1234",
    modelFetcher(["lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF", "TheBloke/Mistral-7B-v0.1-GGUF"]),
  );
  assertEquals(result.ok, true);
});

Deno.test("Verify: LM Studio model not found returns error", async () => {
  const result = await verifyProvider(
    "lmstudio", "", "nonexistent/model", "http://localhost:1234",
    modelFetcher(["lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF"]),
  );
  assertEquals(result.ok, false);
  assertStringIncludes(result.error!, "nonexistent/model");
  assertStringIncludes(result.error!, "was not found");
});

Deno.test("Verify: LM Studio uses custom endpoint URL", async () => {
  const { fetcher, captured } = capturingFetcher("lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF");
  await verifyProvider("lmstudio", "", "lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF", "http://192.168.1.50:1234", fetcher);
  assertEquals(captured.url, "http://192.168.1.50:1234/v1/models");
});

Deno.test("Verify: LM Studio network error shows endpoint in message", async () => {
  const result = await verifyProvider(
    "lmstudio", "", "some-model", "http://192.168.1.50:1234",
    networkErrorFetcher(),
  );
  assertEquals(result.ok, false);
  assertEquals(
    result.error,
    "Could not reach http://192.168.1.50:1234. Check the address and your internet connection.",
  );
});

Deno.test("Verify: LM Studio sends no auth headers", async () => {
  const { fetcher, captured } = capturingFetcher("lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF");
  await verifyProvider("lmstudio", "", "lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF", "http://localhost:1234", fetcher);
  assertEquals(captured.headers["Authorization"], undefined);
  assertEquals(captured.headers["x-api-key"], undefined);
});
