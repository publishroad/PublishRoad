import { createHash, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

type StoredResponse = {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
};

type IdempotentExecutionResult = {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
};

type RunIdempotentJsonOptions = {
  request: NextRequest;
  scope: string;
  payload: unknown;
  clientIp?: string;
  ttlSeconds?: number;
  lockSeconds?: number;
  execute: () => Promise<IdempotentExecutionResult>;
};

const DEFAULT_TTL_SECONDS = Number(process.env.IDEMPOTENCY_TTL_SECONDS ?? 120);
const DEFAULT_LOCK_SECONDS = Number(process.env.IDEMPOTENCY_LOCK_SECONDS ?? 30);
const WAIT_FOR_RESULT_MS = Number(process.env.IDEMPOTENCY_WAIT_MS ?? 2000);
const POLL_INTERVAL_MS = 100;

const isRedisConfigured =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !process.env.UPSTASH_REDIS_REST_URL.includes("placeholder");

const memoryState = globalThis as typeof globalThis & {
  __idempotencyMemory?: {
    responses: Map<string, { expiresAt: number; value: StoredResponse }>;
    locks: Map<string, { expiresAt: number; token: string }>;
  };
};

const memory =
  memoryState.__idempotencyMemory ??
  {
    responses: new Map<string, { expiresAt: number; value: StoredResponse }>(),
    locks: new Map<string, { expiresAt: number; token: string }>(),
  };

if (!memoryState.__idempotencyMemory) {
  memoryState.__idempotencyMemory = memory;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return `{${entries
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
    .join(",")}}`;
}

function createServerDerivedKey(scope: string, payload: unknown, clientIp?: string): string {
  const fingerprint = createHash("sha256")
    .update(scope)
    .update("|")
    .update(clientIp ?? "unknown")
    .update("|")
    .update(stableStringify(payload))
    .digest("hex");

  return `srv_${fingerprint}`;
}

function resolveIdempotencyKey(request: NextRequest, scope: string, payload: unknown, clientIp?: string): string {
  const clientProvided =
    request.headers.get("idempotency-key") ?? request.headers.get("x-idempotency-key");

  if (clientProvided && clientProvided.trim().length > 0) {
    return `cli_${scope}_${clientProvided.trim()}`;
  }

  return createServerDerivedKey(scope, payload, clientIp);
}

function responseCacheKey(scope: string, key: string): string {
  return `idempotency:response:${scope}:${key}`;
}

function lockCacheKey(scope: string, key: string): string {
  return `idempotency:lock:${scope}:${key}`;
}

function addIdempotencyHeaders(
  headers: Record<string, string> | undefined,
  key: string,
  status: "created" | "replayed"
): Record<string, string> {
  return {
    ...(headers ?? {}),
    "Idempotency-Key": key,
    "Idempotency-Status": status,
  };
}

async function getStoredResponse(cacheKey: string): Promise<StoredResponse | null> {
  if (!isRedisConfigured) {
    const memoryEntry = memory.responses.get(cacheKey);
    if (!memoryEntry) return null;
    if (memoryEntry.expiresAt <= Date.now()) {
      memory.responses.delete(cacheKey);
      return null;
    }
    return memoryEntry.value;
  }

  return redis.get<StoredResponse>(cacheKey);
}

async function setStoredResponse(cacheKey: string, value: StoredResponse, ttlSeconds: number): Promise<void> {
  if (!isRedisConfigured) {
    memory.responses.set(cacheKey, {
      expiresAt: Date.now() + ttlSeconds * 1000,
      value,
    });
    return;
  }

  await redis.set(cacheKey, value, { ex: ttlSeconds });
}

async function tryAcquireLock(lockKey: string, token: string, lockSeconds: number): Promise<boolean> {
  if (!isRedisConfigured) {
    const current = memory.locks.get(lockKey);
    if (current && current.expiresAt > Date.now()) {
      return false;
    }

    memory.locks.set(lockKey, {
      token,
      expiresAt: Date.now() + lockSeconds * 1000,
    });

    return true;
  }

  const result = await redis.set(lockKey, token, { nx: true, ex: lockSeconds });
  return result === "OK";
}

async function releaseLock(lockKey: string, token: string): Promise<void> {
  if (!isRedisConfigured) {
    const current = memory.locks.get(lockKey);
    if (current?.token === token) {
      memory.locks.delete(lockKey);
    }
    return;
  }

  const current = await redis.get<string>(lockKey);
  if (current === token) {
    await redis.del(lockKey);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForStoredResponse(cacheKey: string): Promise<StoredResponse | null> {
  const deadline = Date.now() + WAIT_FOR_RESULT_MS;

  while (Date.now() < deadline) {
    const replay = await getStoredResponse(cacheKey);
    if (replay) {
      return replay;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  return null;
}

export async function runIdempotentJson(options: RunIdempotentJsonOptions): Promise<NextResponse> {
  const ttlSeconds = options.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const lockSeconds = options.lockSeconds ?? DEFAULT_LOCK_SECONDS;

  const idempotencyKey = resolveIdempotencyKey(
    options.request,
    options.scope,
    options.payload,
    options.clientIp
  );

  const cacheKey = responseCacheKey(options.scope, idempotencyKey);
  const lockKey = lockCacheKey(options.scope, idempotencyKey);

  const replay = await getStoredResponse(cacheKey);
  if (replay) {
    return NextResponse.json(replay.body, {
      status: replay.status,
      headers: addIdempotencyHeaders(replay.headers, idempotencyKey, "replayed"),
    });
  }

  const lockToken = randomUUID();
  const acquired = await tryAcquireLock(lockKey, lockToken, lockSeconds);

  if (!acquired) {
    const eventualReplay = await waitForStoredResponse(cacheKey);
    if (eventualReplay) {
      return NextResponse.json(eventualReplay.body, {
        status: eventualReplay.status,
        headers: addIdempotencyHeaders(eventualReplay.headers, idempotencyKey, "replayed"),
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "REQUEST_IN_PROGRESS",
          message: "Duplicate request is still processing. Please retry shortly.",
        },
      },
      {
        status: 409,
        headers: addIdempotencyHeaders({ "Retry-After": "1" }, idempotencyKey, "replayed"),
      }
    );
  }

  try {
    const result = await options.execute();
    const stored: StoredResponse = {
      status: result.status,
      body: result.body,
      headers: result.headers,
    };

    if (result.status < 500) {
      await setStoredResponse(cacheKey, stored, ttlSeconds);
    }

    return NextResponse.json(result.body, {
      status: result.status,
      headers: addIdempotencyHeaders(result.headers, idempotencyKey, "created"),
    });
  } finally {
    await releaseLock(lockKey, lockToken);
  }
}
