/**
 * Shared mock fetcher helpers for Cloud API tests.
 *
 * @module
 */

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function mockFetcher(status: number, body: unknown): typeof fetch {
  return (
    _url: string | URL | Request,
    _init?: RequestInit,
  ): Promise<Response> => {
    return Promise.resolve(jsonResponse(status, body));
  };
}

export function networkErrorFetcher(): typeof fetch {
  return (
    _url: string | URL | Request,
    _init?: RequestInit,
  ): Promise<Response> => {
    return Promise.reject(new TypeError("Failed to fetch"));
  };
}

export function capturingFetcher(
  status: number,
  body: unknown,
): {
  fetcher: typeof fetch;
  readonly captured: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: string;
  };
} {
  const captured = {
    url: "",
    method: "",
    headers: {} as Record<string, string>,
    body: "",
  };
  const fetcher = (
    url: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    captured.url = typeof url === "string"
      ? url
      : url instanceof URL
      ? url.toString()
      : url.url;
    captured.method = init?.method ?? "GET";
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
    if (init?.body && typeof init.body === "string") {
      captured.body = init.body;
    }
    return Promise.resolve(jsonResponse(status, body));
  };
  return { fetcher, captured };
}
