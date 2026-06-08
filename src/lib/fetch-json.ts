/**
 * Fetch wrapper that never throws a cryptic "Unexpected token" JSON parse
 * error. If the server returns a non-JSON body (e.g. a Vercel 504/500 HTML
 * error page), this surfaces a clean, human-readable error instead.
 */
export async function fetchJson<T = unknown>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  const text = await res.text();

  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON response (gateway timeout page, proxy error, etc.)
    if (res.status === 504) {
      throw new Error('Request timed out — the data set is large and still loading. Please try again in a moment.');
    }
    if (!res.ok) {
      throw new Error(`Server error (${res.status}). Please try again.`);
    }
    throw new Error('Unexpected response from server.');
  }

  if (!res.ok) {
    const message = (data as { error?: string })?.error ?? `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data as T;
}
