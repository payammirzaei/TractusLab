export type RetryOptions = {
  attempts?: number;
  timeoutMs?: number;
  baseDelayMs?: number;
};

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

export function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUS.has(status);
}

export function retryDelayMs(attempt: number, baseDelayMs = 180): number {
  return Math.min(1500, baseDelayMs * 2 ** Math.max(0, attempt - 1));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryAfterMs(response: Response): number | null {
  const header = response.headers.get("retry-after");
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(3000, seconds * 1000);
  return null;
}

export async function resilientFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: RetryOptions = {},
): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const safeToRetry = method === "GET" || method === "HEAD";
  const attempts = safeToRetry ? Math.max(1, options.attempts ?? 3) : 1;
  const timeoutMs = Math.max(500, options.timeoutMs ?? 8000);
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const externalSignal = init.signal;
    const abortFromExternal = () => controller.abort();
    externalSignal?.addEventListener("abort", abortFromExternal, { once: true });

    try {
      const response = await fetch(input, { ...init, signal: controller.signal });
      if (!safeToRetry || !isRetryableStatus(response.status) || attempt === attempts) return response;
      await sleep(retryAfterMs(response) ?? retryDelayMs(attempt, options.baseDelayMs));
    } catch (error) {
      lastError = error;
      if (!safeToRetry || externalSignal?.aborted || attempt === attempts) throw error;
      await sleep(retryDelayMs(attempt, options.baseDelayMs));
    } finally {
      clearTimeout(timeout);
      externalSignal?.removeEventListener("abort", abortFromExternal);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Network request failed");
}
