import React from "react";
import { randomUUID } from "crypto";
import { redis } from "@/lib/redis";
import { sendEmailWithActiveProvider } from "@/lib/email/service";

type EmailJobKind =
  | "verification"
  | "welcome"
  | "password_reset"
  | "support_contact"
  | "account_deleted";

type EmailJob = {
  id: string;
  kind: EmailJobKind;
  to: string;
  name?: string;
  token?: string;
  subject?: string;
  text?: string;
  createdAt: number;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: number;
  lastError?: string;
};

type QueueStats = {
  accepted: boolean;
  jobId: string;
};

type ProcessStats = {
  processed: number;
  sent: number;
  retried: number;
  failed: number;
};

const QUEUE_PENDING_KEY = "queue:email:pending";
const QUEUE_RETRY_KEY = "queue:email:retry";
const QUEUE_DEAD_KEY = "queue:email:dead";

const MAX_ATTEMPTS = Number(process.env.EMAIL_QUEUE_MAX_ATTEMPTS ?? 5);
const RETRY_BASE_MS = Number(process.env.EMAIL_QUEUE_RETRY_BASE_MS ?? 2000);
const SHOULD_PROCESS_IMMEDIATELY = process.env.EMAIL_QUEUE_IMMEDIATE_PROCESS !== "false";

const isRedisConfigured =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !process.env.UPSTASH_REDIS_REST_URL.includes("placeholder");

const memoryState = globalThis as typeof globalThis & {
  __emailQueueMemory?: {
    pending: EmailJob[];
    retry: EmailJob[];
    dead: EmailJob[];
  };
};

const memoryQueue =
  memoryState.__emailQueueMemory ??
  {
    pending: [],
    retry: [],
    dead: [],
  };

if (!memoryState.__emailQueueMemory) {
  memoryState.__emailQueueMemory = memoryQueue;
}

function nowMs(): number {
  return Date.now();
}

function calcBackoffMs(attempts: number): number {
  const capped = Math.min(attempts, 8);
  return RETRY_BASE_MS * Math.pow(2, Math.max(0, capped - 1));
}

function toEmailJob(raw: unknown): EmailJob | null {
  if (!raw) {
    return null;
  }

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as EmailJob;
    } catch {
      return null;
    }
  }

  if (typeof raw === "object") {
    return raw as EmailJob;
  }

  return null;
}

async function enqueueRaw(job: EmailJob): Promise<void> {
  if (!isRedisConfigured) {
    memoryQueue.pending.push(job);
    return;
  }

  await redis.rpush(QUEUE_PENDING_KEY, job);
}

async function popPendingRaw(): Promise<EmailJob | null> {
  if (!isRedisConfigured) {
    return memoryQueue.pending.shift() ?? null;
  }

  const raw = await redis.lpop(QUEUE_PENDING_KEY);
  if (!raw) return null;
  const parsed = toEmailJob(raw);
  if (!parsed) {
    console.error("[EmailQueue] Corrupt pending payload dropped", { raw });
    return null;
  }

  return parsed;
}

async function moveDueRetryJobsToPending(): Promise<void> {
  const now = nowMs();

  if (!isRedisConfigured) {
    const due = memoryQueue.retry.filter((job) => job.nextAttemptAt <= now);
    if (due.length === 0) return;

    memoryQueue.retry = memoryQueue.retry.filter((job) => job.nextAttemptAt > now);
    memoryQueue.pending.push(...due);
    return;
  }

  let due: unknown[] = [];
  try {
    const rows = await redis.zrange(QUEUE_RETRY_KEY, 0, now, {
      byScore: true,
    });
    due = Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.error("[EmailQueue] Failed to read retry set", error);
    return;
  }

  if (!due || due.length === 0) {
    return;
  }

  for (const raw of due) {
    const job = toEmailJob(raw);
    if (!job) {
      await redis.zrem(QUEUE_RETRY_KEY, raw);
      continue;
    }

    await redis.zrem(QUEUE_RETRY_KEY, raw);
    await redis.rpush(QUEUE_PENDING_KEY, job);
  }
}

async function scheduleRetry(job: EmailJob, error: unknown): Promise<void> {
  const attempts = job.attempts + 1;
  const nextAttemptAt = nowMs() + calcBackoffMs(attempts);
  const retriable: EmailJob = {
    ...job,
    attempts,
    nextAttemptAt,
    lastError: error instanceof Error ? error.message : String(error),
  };

  if (attempts >= job.maxAttempts) {
    console.error("[EmailQueue] Permanent failure", {
      id: retriable.id,
      kind: retriable.kind,
      to: retriable.to,
      attempts: retriable.attempts,
      lastError: retriable.lastError,
    });

    if (!isRedisConfigured) {
      memoryQueue.dead.push(retriable);
      return;
    }

    await redis.rpush(QUEUE_DEAD_KEY, retriable);
    return;
  }

  console.error("[EmailQueue] Send failed, scheduling retry", {
    id: retriable.id,
    kind: retriable.kind,
    to: retriable.to,
    attempts: retriable.attempts,
    nextAttemptAt,
    lastError: retriable.lastError,
  });

  if (!isRedisConfigured) {
    memoryQueue.retry.push(retriable);
    return;
  }

  await redis.zadd(QUEUE_RETRY_KEY, { score: nextAttemptAt, member: retriable });
}

async function deliver(job: EmailJob): Promise<void> {
  if (job.kind === "verification") {
    const { VerifyEmailTemplate } = await import("@/emails/verify-email");
    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${job.token ?? ""}`;
    await sendEmailWithActiveProvider({
      to: job.to,
      subject: "Verify your PublishRoad email",
      react: React.createElement(VerifyEmailTemplate, {
        name: job.name ?? "there",
        verifyUrl,
      }),
    });
    return;
  }

  if (job.kind === "welcome") {
    const { WelcomeTemplate } = await import("@/emails/welcome");
    await sendEmailWithActiveProvider({
      to: job.to,
      subject: "Welcome to PublishRoad 🚀",
      react: React.createElement(WelcomeTemplate, { name: job.name ?? "there" }),
    });
    return;
  }

  if (job.kind === "password_reset") {
    const { PasswordResetTemplate } = await import("@/emails/password-reset");
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${job.token ?? ""}`;
    await sendEmailWithActiveProvider({
      to: job.to,
      subject: "Reset your PublishRoad password",
      react: React.createElement(PasswordResetTemplate, {
        name: job.name ?? "there",
        resetUrl,
      }),
    });
    return;
  }

  if (job.kind === "support_contact" || job.kind === "account_deleted") {
    await sendEmailWithActiveProvider({
      to: job.to,
      subject: job.subject ?? "PublishRoad notification",
      text: job.text ?? "",
    });
    return;
  }

  throw new Error(`Unsupported email job kind: ${job.kind}`);
}

export async function enqueueEmailJob(
  kind: EmailJobKind,
  payload: Omit<EmailJob, "id" | "kind" | "createdAt" | "attempts" | "maxAttempts" | "nextAttemptAt">
): Promise<QueueStats> {
  const job: EmailJob = {
    id: randomUUID(),
    kind,
    createdAt: nowMs(),
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    nextAttemptAt: nowMs(),
    ...payload,
  };

  await enqueueRaw(job);

  if (SHOULD_PROCESS_IMMEDIATELY) {
    try {
      await processEmailQueueBatch(1);
    } catch (error) {
      console.error("[EmailQueue] Immediate processing failed; job remains queued", {
        jobId: job.id,
        error,
      });
    }
  }

  return { accepted: true, jobId: job.id };
}

export async function processEmailQueueBatch(maxJobs = 25): Promise<ProcessStats> {
  await moveDueRetryJobsToPending();

  const stats: ProcessStats = {
    processed: 0,
    sent: 0,
    retried: 0,
    failed: 0,
  };

  for (let i = 0; i < maxJobs; i += 1) {
    const job = await popPendingRaw();
    if (!job) break;

    stats.processed += 1;

    try {
      await deliver(job);
      stats.sent += 1;
    } catch (error) {
      await scheduleRetry(job, error);
      if (job.attempts + 1 >= job.maxAttempts) {
        stats.failed += 1;
      } else {
        stats.retried += 1;
      }
    }
  }

  return stats;
}
