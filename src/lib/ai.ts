import OpenAI from "openai";
import { db } from "./db";
import { getCachedWithLock, CacheKeys, CacheTTL } from "./cache";
import { decryptField } from "./server-utils";

const DEFAULT_AI_TIMEOUT_MS = Number(process.env.CURATION_AI_TIMEOUT_MS ?? 25000);

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return new Promise<T>((resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => {
        if (timer) clearTimeout(timer);
      });
  });
}

// ─────────────────────────────────────────────
// Load AI config from DB (cached 5min)
// ─────────────────────────────────────────────
interface AiConfigData {
  baseUrl: string;
  apiKey: string; // decrypted
  modelName: string;
  maxTokens: number;
  temperature: number;
}

export async function getAiConfig(): Promise<AiConfigData> {
  return getCachedWithLock(
    CacheKeys.aiConfig,
    CacheTTL.AI_CONFIG,
    async () => {
      const config = await db.aiConfig.findUnique({
        where: { id: "default" },
      });
      if (!config) {
        throw new Error(
          "AI config not set. Please configure it in Admin > Settings."
        );
      }
      return {
        baseUrl: config.baseUrl,
        apiKey: decryptField(config.apiKey),
        modelName: config.modelName,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
      };
    }
  );
}

// ─────────────────────────────────────────────
// OpenAI-compatible client factory
// ─────────────────────────────────────────────
export async function getAiClient(): Promise<OpenAI> {
  const config = await getAiConfig();
  return new OpenAI({
    baseURL: config.baseUrl,
    apiKey: config.apiKey,
  });
}

// ─────────────────────────────────────────────
// Generic AI call
// ─────────────────────────────────────────────
export async function callAI(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const config = await getAiConfig();
  const client = await getAiClient();

  const response = await withTimeout(
    client.chat.completions.create({
      model: config.modelName,
      messages,
      max_tokens: options?.maxTokens ?? config.maxTokens,
      temperature: options?.temperature ?? config.temperature,
      response_format: { type: "json_object" },
    }),
    DEFAULT_AI_TIMEOUT_MS,
    "AI request timed out"
  );

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("AI returned empty response");
  return content;
}

// ─────────────────────────────────────────────
// Test AI connection (used by admin settings page)
// ─────────────────────────────────────────────
export async function testAiConnection({
  baseUrl,
  apiKey,
  modelName,
}: {
  baseUrl: string;
  apiKey: string;
  modelName: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const client = new OpenAI({ baseURL: baseUrl, apiKey });
    const response = await client.chat.completions.create({
      model: modelName,
      messages: [{ role: "user", content: "Say 'ok' in JSON: {\"status\": \"ok\"}" }],
      max_tokens: 10,
    });
    const content = response.choices[0]?.message?.content ?? "";
    return { success: content.length > 0, message: "Connection successful" };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Connection failed",
    };
  }
}
