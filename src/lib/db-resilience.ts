type RetryOptions = {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
};

const TRANSIENT_PATTERNS = [
  /timeout exceeded when trying to connect/i,
  /connection|connect|pool/i,
  /ECONNREFUSED/i,
  /P1001/i,
  /P2024/i,
  /P6004/i,
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientDbError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return TRANSIENT_PATTERNS.some((pattern) => pattern.test(message));
}

export async function withDbRetry<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const retries = options.retries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 120;
  const maxDelayMs = options.maxDelayMs ?? 1200;

  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= retries || !isTransientDbError(error)) {
        throw error;
      }

      const jitter = Math.floor(Math.random() * 60);
      const delay = Math.min(maxDelayMs, baseDelayMs * (2 ** attempt) + jitter);
      attempt += 1;
      await sleep(delay);
    }
  }
}
