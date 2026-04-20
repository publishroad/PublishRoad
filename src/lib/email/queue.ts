import React from "react";
import { randomUUID } from "crypto";
import { redis } from "@/lib/redis";
import { sendEmailWithActiveProvider } from "@/lib/email/service";

type EmailQueueChannel = "transactional" | "support";

type EmailJobKind =
  | "verification"
  | "welcome"
  | "password_reset"
  | "support_contact"
  | "account_deleted";

type EmailJob = {
  id: string;
  kind: EmailJobKind;
  channel: EmailQueueChannel;
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
  lastErrorAt?: number;
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

export type EmailQueueClearStats = {
  pendingCleared: number;
  retryCleared: number;
  deadCleared: number;
};

export type EmailQueueClearResult = {
  total: EmailQueueClearStats;
  transactional: EmailQueueClearStats;
  support: EmailQueueClearStats;
};

export type EmailQueueErrorLog = {
  jobId: string;
  kind: EmailJobKind;
  channel: EmailQueueChannel;
  to: string;
  attempts: number;
  status: "retrying" | "failed";
  message: string;
  at: number;
  nextAttemptAt: number | null;
};

export type EmailQueueActivityLog = {
  jobId: string;
  kind: EmailJobKind;
  channel: EmailQueueChannel;
  to: string;
  attempts: number;
  status: "sent" | "retrying" | "failed";
  subject: string;
  bodyPreview: string | null;
  errorMessage: string | null;
  at: number;
  nextAttemptAt: number | null;
};

export type EmailQueueInsights = {
  successfulSends: number;
  recentErrors: EmailQueueErrorLog[];
  recentActivity: EmailQueueActivityLog[];
};

export type EmailQueueHealth = {
  pending: number;
  retry: number;
  dead: number;
  nextRetryAt: number | null;
  transactional: QueueHealthSnapshot;
  support: QueueHealthSnapshot;
};

type QueueHealthSnapshot = {
  pending: number;
  retry: number;
  dead: number;
  nextRetryAt: number | null;
};

const MAX_ATTEMPTS = Number(process.env.EMAIL_QUEUE_MAX_ATTEMPTS ?? 5);
const RETRY_BASE_MS = Number(process.env.EMAIL_QUEUE_RETRY_BASE_MS ?? 2000);
const SHOULD_PROCESS_IMMEDIATELY = process.env.EMAIL_QUEUE_IMMEDIATE_PROCESS !== "false";
const SENT_COUNTER_KEY = "queue:email:metrics:sent";
const ACTIVITY_LOG_KEY = "queue:email:metrics:activity";
const MAX_ACTIVITY_ENTRIES = 250;

const isRedisConfigured =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !process.env.UPSTASH_REDIS_REST_URL.includes("placeholder");

const memoryState = globalThis as typeof globalThis & {
  __emailQueueMemory?: Record<EmailQueueChannel, { pending: EmailJob[]; retry: EmailJob[]; dead: EmailJob[] }>;
  __emailQueueSentCount?: number;
  __emailQueueActivity?: EmailQueueActivityLog[];
};

const memoryQueue =
  memoryState.__emailQueueMemory ??
  {
    transactional: {
      pending: [],
      retry: [],
      dead: [],
    },
    support: {
      pending: [],
      retry: [],
      dead: [],
    },
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

function getChannelForJobKind(kind: EmailJobKind): EmailQueueChannel {
  return kind === "support_contact" ? "support" : "transactional";
}

function getQueueKeys(channel: EmailQueueChannel): {
  pendingKey: string;
  retryKey: string;
  deadKey: string;
} {
  if (channel === "transactional") {
    // Keep legacy keys for backward compatibility with existing queued items.
    return {
      pendingKey: "queue:email:pending",
      retryKey: "queue:email:retry",
      deadKey: "queue:email:dead",
    };
  }

  return {
    pendingKey: "queue:email:support:pending",
    retryKey: "queue:email:support:retry",
    deadKey: "queue:email:support:dead",
  };
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

function toNumberOrZero(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toEmailQueueActivity(raw: unknown): EmailQueueActivityLog | null {
  if (!raw) {
    return null;
  }

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as EmailQueueActivityLog;
    } catch {
      return null;
    }
  }

  if (typeof raw === "object") {
    return raw as EmailQueueActivityLog;
  }

  return null;
}

function getSubjectForJob(job: EmailJob): string {
  if (job.kind === "verification") return "Verify your PublishRoad email";
  if (job.kind === "welcome") return "Welcome to PublishRoad 🚀";
  if (job.kind === "password_reset") return "Reset your PublishRoad password";
  if (job.kind === "support_contact") return job.subject ?? "New contact form submission";
  if (job.kind === "account_deleted") return job.subject ?? "PublishRoad notification";
  return job.subject ?? "PublishRoad email";
}

function getBodyPreviewForJob(job: EmailJob): string | null {
  if (job.text && job.text.trim().length > 0) {
    return job.text;
  }

  if (job.kind === "verification") return "Template: verification email";
  if (job.kind === "welcome") return "Template: welcome email";
  if (job.kind === "password_reset") return "Template: password reset email";
  return null;
}

async function appendActivityLog(entry: EmailQueueActivityLog): Promise<void> {
  if (!isRedisConfigured) {
    const current = memoryState.__emailQueueActivity ?? [];
    memoryState.__emailQueueActivity = [entry, ...current].slice(0, MAX_ACTIVITY_ENTRIES);
    return;
  }

  await redis.zadd(ACTIVITY_LOG_KEY, { score: entry.at, member: JSON.stringify(entry) });
  const rows = await redis.zrange(ACTIVITY_LOG_KEY, 0, -1);
  const items = Array.isArray(rows) ? rows : [];
  const overflow = items.length - MAX_ACTIVITY_ENTRIES;
  if (overflow > 0) {
    const toRemove = items.slice(0, overflow);
    for (const member of toRemove) {
      await redis.zrem(ACTIVITY_LOG_KEY, member);
    }
  }
}

function toErrorLog(job: EmailJob, status: "retrying" | "failed"): EmailQueueErrorLog | null {
  if (!job.lastError) {
    return null;
  }

  return {
    jobId: job.id,
    kind: job.kind,
    channel: job.channel,
    to: job.to,
    attempts: job.attempts,
    status,
    message: job.lastError,
    at: job.lastErrorAt ?? job.nextAttemptAt ?? job.createdAt,
    nextAttemptAt: status === "retrying" ? job.nextAttemptAt : null,
  };
}

async function incrementSuccessfulSends(by = 1): Promise<void> {
  if (by <= 0) return;

  if (!isRedisConfigured) {
    memoryState.__emailQueueSentCount = (memoryState.__emailQueueSentCount ?? 0) + by;
    return;
  }

  const current = await redis.get(SENT_COUNTER_KEY);
  await redis.set(SENT_COUNTER_KEY, toNumberOrZero(current) + by);
}

async function getSuccessfulSendsCount(): Promise<number> {
  if (!isRedisConfigured) {
    return memoryState.__emailQueueSentCount ?? 0;
  }

  const value = await redis.get(SENT_COUNTER_KEY);
  return toNumberOrZero(value);
}

async function getRecentErrorLogs(limit: number): Promise<EmailQueueErrorLog[]> {
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 50) : 10;
  const channels: EmailQueueChannel[] = ["transactional", "support"];

  if (!isRedisConfigured) {
    const entries: EmailQueueErrorLog[] = [];
    for (const channel of channels) {
      for (const job of memoryQueue[channel].retry) {
        const entry = toErrorLog(job, "retrying");
        if (entry) entries.push(entry);
      }

      for (const job of memoryQueue[channel].dead) {
        const entry = toErrorLog(job, "failed");
        if (entry) entries.push(entry);
      }
    }

    return entries.sort((a, b) => b.at - a.at).slice(0, safeLimit);
  }

  const entries: EmailQueueErrorLog[] = [];

  for (const channel of channels) {
    const keys = getQueueKeys(channel);
    const [retryRows, deadRows] = await Promise.all([
      redis.zrange(keys.retryKey, 0, -1),
      redis.lrange(keys.deadKey, 0, -1),
    ]);

    for (const raw of Array.isArray(retryRows) ? retryRows : []) {
      const job = toEmailJob(raw);
      if (!job) continue;
      if (!job.channel) job.channel = channel;
      const entry = toErrorLog(job, "retrying");
      if (entry) entries.push(entry);
    }

    for (const raw of Array.isArray(deadRows) ? deadRows : []) {
      const job = toEmailJob(raw);
      if (!job) continue;
      if (!job.channel) job.channel = channel;
      const entry = toErrorLog(job, "failed");
      if (entry) entries.push(entry);
    }
  }

  return entries.sort((a, b) => b.at - a.at).slice(0, safeLimit);
}

async function getRecentActivityLogs(limit: number): Promise<EmailQueueActivityLog[]> {
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 50) : 10;

  if (!isRedisConfigured) {
    return (memoryState.__emailQueueActivity ?? []).slice(0, safeLimit);
  }

  const rows = await redis.zrange(ACTIVITY_LOG_KEY, 0, -1);
  const parsed = (Array.isArray(rows) ? rows : [])
    .map((raw) => toEmailQueueActivity(raw))
    .filter((entry): entry is EmailQueueActivityLog => !!entry)
    .sort((a, b) => b.at - a.at)
    .slice(0, safeLimit);

  return parsed;
}

export async function getEmailQueueInsights(limit = 10): Promise<EmailQueueInsights> {
  const [successfulSends, recentErrors, recentActivity] = await Promise.all([
    getSuccessfulSendsCount(),
    getRecentErrorLogs(limit),
    getRecentActivityLogs(limit),
  ]);

  return {
    successfulSends,
    recentErrors,
    recentActivity,
  };
}

async function enqueueRaw(job: EmailJob): Promise<void> {
  const keys = getQueueKeys(job.channel);

  if (!isRedisConfigured) {
    memoryQueue[job.channel].pending.push(job);
    return;
  }

  await redis.rpush(keys.pendingKey, job);
}

async function popPendingRaw(channel: EmailQueueChannel): Promise<EmailJob | null> {
  const keys = getQueueKeys(channel);

  if (!isRedisConfigured) {
    return memoryQueue[channel].pending.shift() ?? null;
  }

  const raw = await redis.lpop(keys.pendingKey);
  if (!raw) return null;
  const parsed = toEmailJob(raw);
  if (!parsed) {
    console.error("[EmailQueue] Corrupt pending payload dropped", { channel, raw });
    return null;
  }

  if (!parsed.channel) {
    parsed.channel = getChannelForJobKind(parsed.kind);
  }

  return parsed;
}

async function moveDueRetryJobsToPending(channel: EmailQueueChannel): Promise<void> {
  const keys = getQueueKeys(channel);
  const now = nowMs();

  if (!isRedisConfigured) {
    const due = memoryQueue[channel].retry.filter((job) => job.nextAttemptAt <= now);
    if (due.length === 0) return;

    memoryQueue[channel].retry = memoryQueue[channel].retry.filter((job) => job.nextAttemptAt > now);
    memoryQueue[channel].pending.push(...due);
    return;
  }

  let due: unknown[] = [];
  try {
    const rows = await redis.zrange(keys.retryKey, 0, now, {
      byScore: true,
    });
    due = Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.error("[EmailQueue] Failed to read retry set", { channel, error });
    return;
  }

  if (!due || due.length === 0) {
    return;
  }

  for (const raw of due) {
    const job = toEmailJob(raw);
    if (!job) {
      await redis.zrem(keys.retryKey, raw);
      continue;
    }

    if (!job.channel) {
      job.channel = getChannelForJobKind(job.kind);
    }

    await redis.zrem(keys.retryKey, raw);
    await redis.rpush(keys.pendingKey, job);
  }
}

async function scheduleRetry(job: EmailJob, error: unknown): Promise<void> {
  const keys = getQueueKeys(job.channel);
  const attempts = job.attempts + 1;
  const errorAt = nowMs();
  const nextAttemptAt = nowMs() + calcBackoffMs(attempts);
  const retriable: EmailJob = {
    ...job,
    attempts,
    nextAttemptAt,
    lastError: error instanceof Error ? error.message : String(error),
    lastErrorAt: errorAt,
  };

  const status = attempts >= job.maxAttempts ? "failed" : "retrying";
  await appendActivityLog({
    jobId: retriable.id,
    kind: retriable.kind,
    channel: retriable.channel,
    to: retriable.to,
    attempts: retriable.attempts,
    status,
    subject: getSubjectForJob(retriable),
    bodyPreview: getBodyPreviewForJob(retriable),
    errorMessage: retriable.lastError ?? null,
    at: errorAt,
    nextAttemptAt: status === "retrying" ? retriable.nextAttemptAt : null,
  });

  if (attempts >= job.maxAttempts) {
    console.error("[EmailQueue] Permanent failure", {
      id: retriable.id,
      kind: retriable.kind,
      channel: retriable.channel,
      to: retriable.to,
      attempts: retriable.attempts,
      lastError: retriable.lastError,
    });

    if (!isRedisConfigured) {
      memoryQueue[retriable.channel].dead.push(retriable);
      return;
    }

    await redis.rpush(keys.deadKey, retriable);
    return;
  }

  console.error("[EmailQueue] Send failed, scheduling retry", {
    id: retriable.id,
    kind: retriable.kind,
    channel: retriable.channel,
    to: retriable.to,
    attempts: retriable.attempts,
    nextAttemptAt,
    lastError: retriable.lastError,
  });

  if (!isRedisConfigured) {
    memoryQueue[retriable.channel].retry.push(retriable);
    return;
  }

  await redis.zadd(keys.retryKey, { score: nextAttemptAt, member: retriable });
}

async function deliver(job: EmailJob): Promise<void> {
  switch (job.kind) {
    case "verification": {
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

    case "welcome": {
      const { WelcomeTemplate } = await import("@/emails/welcome");
      await sendEmailWithActiveProvider({
        to: job.to,
        subject: "Welcome to PublishRoad 🚀",
        react: React.createElement(WelcomeTemplate, { name: job.name ?? "there" }),
      });
      return;
    }

    case "password_reset": {
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

    case "support_contact": {
      await sendEmailWithActiveProvider({
        to: job.to,
        subject: job.subject ?? "New contact form submission",
        text: job.text ?? "",
      });
      return;
    }

    case "account_deleted": {
      await sendEmailWithActiveProvider({
        to: job.to,
        subject: job.subject ?? "PublishRoad notification",
        text: job.text ?? "",
      });
      return;
    }

    default:
      throw new Error(`Unsupported email job kind: ${job.kind}`);
  }
}

export async function enqueueEmailJob(
  kind: EmailJobKind,
  payload: Omit<EmailJob, "id" | "kind" | "channel" | "createdAt" | "attempts" | "maxAttempts" | "nextAttemptAt">
): Promise<QueueStats> {
  const channel = getChannelForJobKind(kind);

  const job: EmailJob = {
    id: randomUUID(),
    kind,
    channel,
    createdAt: nowMs(),
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    nextAttemptAt: nowMs(),
    ...payload,
  };

  await enqueueRaw(job);

  console.info("[EmailQueue] Job queued", {
    jobId: job.id,
    kind: job.kind,
    channel: job.channel,
    to: job.to,
    createdAt: job.createdAt,
  });

  if (SHOULD_PROCESS_IMMEDIATELY && channel === "transactional") {
    try {
      await processQueueBatch("transactional", 1);
    } catch (error) {
      console.error("[EmailQueue] Immediate processing failed; job remains queued", {
        jobId: job.id,
        channel,
        error,
      });
    }
  }

  return { accepted: true, jobId: job.id };
}

export async function getEmailQueueHealth(): Promise<EmailQueueHealth> {
  const [transactional, support] = await Promise.all([
    getQueueHealthSnapshot("transactional"),
    getQueueHealthSnapshot("support"),
  ]);

  const nextRetryCandidates = [transactional.nextRetryAt, support.nextRetryAt].filter(
    (value): value is number => typeof value === "number"
  );

  return {
    pending: transactional.pending + support.pending,
    retry: transactional.retry + support.retry,
    dead: transactional.dead + support.dead,
    nextRetryAt: nextRetryCandidates.length > 0 ? Math.min(...nextRetryCandidates) : null,
    transactional,
    support,
  };
}

async function getQueueHealthSnapshot(channel: EmailQueueChannel): Promise<QueueHealthSnapshot> {
  const keys = getQueueKeys(channel);

  if (!isRedisConfigured) {
    const nextRetryAt =
      memoryQueue[channel].retry.length > 0
        ? memoryQueue[channel].retry.reduce((min, job) => Math.min(min, job.nextAttemptAt), Number.POSITIVE_INFINITY)
        : Number.POSITIVE_INFINITY;

    return {
      pending: memoryQueue[channel].pending.length,
      retry: memoryQueue[channel].retry.length,
      dead: memoryQueue[channel].dead.length,
      nextRetryAt: Number.isFinite(nextRetryAt) ? nextRetryAt : null,
    };
  }

  const [pending, retry, dead, nextRetryRows] = await Promise.all([
    redis.llen(keys.pendingKey),
    redis.zcard(keys.retryKey),
    redis.llen(keys.deadKey),
    redis.zrange<unknown[]>(keys.retryKey, 0, 0, { byScore: true }),
  ]);

  const nextRetryJob = Array.isArray(nextRetryRows) ? toEmailJob(nextRetryRows[0]) : null;

  return {
    pending: Number(pending ?? 0),
    retry: Number(retry ?? 0),
    dead: Number(dead ?? 0),
    nextRetryAt: nextRetryJob?.nextAttemptAt ?? null,
  };
}

async function clearQueueChannel(channel: EmailQueueChannel): Promise<EmailQueueClearStats> {
  const keys = getQueueKeys(channel);

  if (!isRedisConfigured) {
    const stats: EmailQueueClearStats = {
      pendingCleared: memoryQueue[channel].pending.length,
      retryCleared: memoryQueue[channel].retry.length,
      deadCleared: memoryQueue[channel].dead.length,
    };

    memoryQueue[channel].pending = [];
    memoryQueue[channel].retry = [];
    memoryQueue[channel].dead = [];

    return stats;
  }

  const [pending, retry, dead] = await Promise.all([
    redis.llen(keys.pendingKey),
    redis.zcard(keys.retryKey),
    redis.llen(keys.deadKey),
  ]);

  await redis.del(keys.pendingKey, keys.retryKey, keys.deadKey);

  return {
    pendingCleared: Number(pending ?? 0),
    retryCleared: Number(retry ?? 0),
    deadCleared: Number(dead ?? 0),
  };
}

export async function clearEmailQueue(): Promise<EmailQueueClearResult> {
  const [transactional, support] = await Promise.all([
    clearQueueChannel("transactional"),
    clearQueueChannel("support"),
  ]);

  return {
    total: {
      pendingCleared: transactional.pendingCleared + support.pendingCleared,
      retryCleared: transactional.retryCleared + support.retryCleared,
      deadCleared: transactional.deadCleared + support.deadCleared,
    },
    transactional,
    support,
  };
}

async function processQueueBatch(channel: EmailQueueChannel, maxJobs = 25): Promise<ProcessStats> {
  await moveDueRetryJobsToPending(channel);

  const stats: ProcessStats = {
    processed: 0,
    sent: 0,
    retried: 0,
    failed: 0,
  };

  for (let i = 0; i < maxJobs; i += 1) {
    const job = await popPendingRaw(channel);
    if (!job) break;

    stats.processed += 1;

    console.info("[EmailQueue] Processing job", {
      jobId: job.id,
      kind: job.kind,
      channel: job.channel,
      to: job.to,
      attempt: job.attempts + 1,
      maxAttempts: job.maxAttempts,
    });

    try {
      await deliver(job);
      stats.sent += 1;
      await incrementSuccessfulSends(1);
      await appendActivityLog({
        jobId: job.id,
        kind: job.kind,
        channel: job.channel,
        to: job.to,
        attempts: job.attempts + 1,
        status: "sent",
        subject: getSubjectForJob(job),
        bodyPreview: getBodyPreviewForJob(job),
        errorMessage: null,
        at: nowMs(),
        nextAttemptAt: null,
      });
      console.info("[EmailQueue] Job sent", {
        jobId: job.id,
        kind: job.kind,
        channel: job.channel,
        to: job.to,
        attempt: job.attempts + 1,
      });
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

export async function processEmailQueueBatch(maxJobs = 25): Promise<ProcessStats> {
  const safeMax = Number.isFinite(maxJobs) ? Math.min(Math.max(maxJobs, 1), 200) : 25;

  const transactionalStats = await processQueueBatch("transactional", safeMax);

  const remainingCapacity = safeMax - transactionalStats.processed;
  if (remainingCapacity <= 0) {
    return transactionalStats;
  }

  const supportStats = await processQueueBatch("support", remainingCapacity);

  return {
    processed: transactionalStats.processed + supportStats.processed,
    sent: transactionalStats.sent + supportStats.sent,
    retried: transactionalStats.retried + supportStats.retried,
    failed: transactionalStats.failed + supportStats.failed,
  };
}

export async function processSupportEmailQueueBatch(maxJobs = 25): Promise<ProcessStats> {
  return processQueueBatch("support", maxJobs);
}
