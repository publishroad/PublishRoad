"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const aiConfigSchema = z.object({
  baseUrl: z.string().url("Must be a valid URL"),
  apiKey: z.string().optional(),
  modelName: z.string().min(1, "Model name is required"),
  maxTokens: z.coerce.number().int().min(100).max(128000),
  temperature: z.coerce.number().min(0).max(2),
});

type FormData = z.infer<typeof aiConfigSchema>;

interface AIConfigFormProps {
  initialValues: {
    baseUrl: string;
    apiKey: string;
    modelName: string;
    maxTokens: number;
    temperature: number;
  } | null;
  hasExistingKey: boolean;
}

export function AIConfigForm({ initialValues, hasExistingKey }: AIConfigFormProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(aiConfigSchema) as Resolver<FormData>,
    defaultValues: initialValues ?? {
      baseUrl: "https://api.deepseek.com/v1",
      apiKey: "",
      modelName: "deepseek-chat",
      maxTokens: 4096,
      temperature: 0.3,
    },
  });

  async function onSubmit(data: FormData) {
    const payload: Record<string, unknown> = {
      baseUrl: data.baseUrl,
      modelName: data.modelName,
      maxTokens: data.maxTokens,
      temperature: data.temperature,
    };

    if (data.apiKey && data.apiKey.trim() !== "") {
      payload.apiKey = data.apiKey;
    }

    const res = await fetch("/api/admin/ai-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to save settings");
      return;
    }

    toast.success("AI settings saved successfully");
    setTestResult(null);
  }

  async function handleTestConnection() {
    setIsTesting(true);
    setTestResult(null);

    const data = getValues();
    const payload: Record<string, unknown> = {
      baseUrl: data.baseUrl,
      modelName: data.modelName,
    };
    if (data.apiKey?.trim()) payload.apiKey = data.apiKey;

    const res = await fetch("/api/admin/ai-config/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setIsTesting(false);

    const result = await res.json().catch(() => ({ success: false, message: "Unknown error" }));
    setTestResult({ success: res.ok, message: result.message ?? (res.ok ? "Connection successful" : "Connection failed") });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* API Endpoint */}
      <div className="bg-white rounded-xl border border-border-gray p-6 space-y-4">
        <h2 className="font-semibold text-navy">API Configuration</h2>

        <div className="space-y-1.5">
          <Label htmlFor="baseUrl">API Base URL</Label>
          <Input
            id="baseUrl"
            {...register("baseUrl")}
            placeholder="https://api.deepseek.com/v1"
          />
          <p className="text-xs text-medium-gray">
            Any OpenAI-compatible API endpoint (DeepSeek, OpenAI, Groq, Together, etc.)
          </p>
          {errors.baseUrl && (
            <p className="text-xs text-error">{errors.baseUrl.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="apiKey">
            API Key{" "}
            {hasExistingKey && (
              <span className="text-xs font-normal text-medium-gray">
                (leave blank to keep existing)
              </span>
            )}
          </Label>
          <Input
            id="apiKey"
            type="password"
            {...register("apiKey")}
            placeholder={hasExistingKey ? "••••••••••••••••" : "sk-..."}
            autoComplete="off"
          />
          {errors.apiKey && (
            <p className="text-xs text-error">{errors.apiKey.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="modelName">Model Name</Label>
          <Input
            id="modelName"
            {...register("modelName")}
            placeholder="deepseek-chat"
          />
          <p className="text-xs text-medium-gray">
            Examples: deepseek-chat, gpt-4o, gpt-4o-mini, llama-3.1-70b-instruct
          </p>
          {errors.modelName && (
            <p className="text-xs text-error">{errors.modelName.message}</p>
          )}
        </div>
      </div>

      {/* Model Parameters */}
      <div className="bg-white rounded-xl border border-border-gray p-6 space-y-4">
        <h2 className="font-semibold text-navy">Model Parameters</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="maxTokens">Max Tokens</Label>
            <Input
              id="maxTokens"
              type="number"
              {...register("maxTokens")}
              min={100}
              max={128000}
            />
            {errors.maxTokens && (
              <p className="text-xs text-error">{errors.maxTokens.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="temperature">Temperature</Label>
            <Input
              id="temperature"
              type="number"
              step="0.1"
              {...register("temperature")}
              min={0}
              max={2}
            />
            <p className="text-xs text-medium-gray">0 = deterministic, 1 = creative</p>
            {errors.temperature && (
              <p className="text-xs text-error">{errors.temperature.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Test Connection Result */}
      {testResult && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            testResult.success
              ? "bg-green-50 border border-green-200 text-success"
              : "bg-red-50 border border-red-200 text-error"
          }`}
        >
          {testResult.success ? "✓ " : "✗ "}
          {testResult.message}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          type="submit"
          className="bg-navy hover:bg-blue"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Save Settings"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleTestConnection}
          disabled={isTesting}
        >
          {isTesting ? "Testing..." : "Test Connection"}
        </Button>
      </div>
    </form>
  );
}
