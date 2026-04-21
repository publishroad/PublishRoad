// Cache settings for 300 seconds — form-based, changes are infrequent
export const revalidate = 0;

import { db } from "@/lib/db";
import { isMissingRelationError } from "@/lib/db-error-utils";
import { AIConfigForm } from "@/components/admin/AIConfigForm";
import { PaymentConfigForm } from "@/components/admin/PaymentConfigForm";
import { EmailConfigForm } from "@/components/admin/EmailConfigForm";
import { EmailQueuePanel } from "@/components/admin/EmailQueuePanel";
import { SocialLinksEditor } from "@/components/admin/SocialLinksEditor";
import { SiteNoticeEditor } from "@/components/admin/SiteNoticeEditor";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { formatDate } from "@/lib/utils";
import { getSiteNoticeConfig } from "@/lib/site-notice-config";
import { getEmailQueueHealth, getEmailQueueInsights } from "@/lib/email/queue";
import { getSocialLinksConfig } from "@/lib/social-links-config";

type EmailConfigRow = {
  provider: "resend" | "smtp" | "sendgrid" | "ses";
  from_address: string;
  host: string | null;
  port: number | null;
  username: string | null;
  use_tls: boolean;
  additional_config: unknown;
  api_key: string | null;
  password: string | null;
  updated_at: Date;
};

async function fetchWithMissingRelationFallback<T>(
  relationName: string,
  fallback: T,
  fetcher: () => Promise<T>
): Promise<{ data: T; migrationMissing: boolean }> {
  try {
    const data = await fetcher();
    return { data, migrationMissing: false };
  } catch (error) {
    if (isMissingRelationError(error, relationName)) {
      return { data: fallback, migrationMissing: true };
    }
    throw error;
  }
}

export default async function AdminSettingsPage() {
  const [
    aiConfig,
    paymentConfigResult,
    emailRowsResult,
    siteNoticeConfig,
    emailQueueHealth,
    emailQueueInsights,
    socialLinksConfig,
  ] = await Promise.all([
    db.aiConfig.findUnique({ where: { id: "default" } }),
    fetchWithMissingRelationFallback("payment_gateway_config", [], async () =>
      db.$queryRaw<Array<{
        provider: "stripe" | "paypal" | "razorpay";
        is_active: boolean;
        public_key: string | null;
        secret_key: string | null;
        webhook_secret: string | null;
        additional_config: unknown;
      }>>`
        SELECT provider, is_active, public_key, secret_key, webhook_secret, additional_config
        FROM payment_gateway_config
        ORDER BY updated_at DESC
      `
    ),
    fetchWithMissingRelationFallback("email_provider_config", [] as EmailConfigRow[], async () =>
      db.$queryRaw<EmailConfigRow[]>`
          SELECT provider, from_address, host, port, username, use_tls, additional_config, api_key, password, updated_at
          FROM email_provider_config
          WHERE id = 'default'
          LIMIT 1
      `
    ),
    getSiteNoticeConfig(),
    getEmailQueueHealth(),
    getEmailQueueInsights(12),
    getSocialLinksConfig(),
  ]);

  const paymentMigrationMissing = paymentConfigResult.migrationMissing;
  const paymentRows = (paymentConfigResult.data ?? []) as Array<{
    provider: "stripe" | "paypal" | "razorpay";
    is_active: boolean;
    public_key: string | null;
    secret_key: string | null;
    webhook_secret: string | null;
    additional_config: unknown;
  }>;
  const emailRows = emailRowsResult.data;
  const emailMigrationMissing = emailRowsResult.migrationMissing;
  const emailConfig = emailRows[0] ?? null;

  const initialValues = aiConfig
    ? {
        baseUrl: aiConfig.baseUrl,
        apiKey: "",
        modelName: aiConfig.modelName,
        maxTokens: aiConfig.maxTokens,
        temperature: aiConfig.temperature,
      }
    : null;

  const paymentInitialConfigs = paymentRows.map((r) => ({
    provider: r.provider,
    isActive: r.is_active,
    publicKey: r.public_key ?? "",
    hasSecretKey: !!r.secret_key,
    hasWebhookSecret: !!r.webhook_secret,
    additionalConfig:
      typeof r.additional_config === "object" && r.additional_config !== null
        ? (r.additional_config as Record<string, unknown>)
        : {},
  }));

  const emailInitialValues = emailConfig
    ? {
        provider: emailConfig.provider,
        fromAddress: emailConfig.from_address,
        host: emailConfig.host ?? "",
        port: emailConfig.port,
        username: emailConfig.username ?? "",
        useTls: emailConfig.use_tls,
        additionalConfig:
          typeof emailConfig.additional_config === "object" && emailConfig.additional_config !== null
            ? (emailConfig.additional_config as Record<string, unknown>)
            : {},
      }
    : null;

  return (
    <>
      <AppHeader title="System Settings" />
      <div className="flex-1 p-6 max-w-2xl space-y-10">
        <section id="ai-settings" className="scroll-mt-20">
          <p className="text-sm text-gray-400 mb-6">Configure the AI model used for curation matching.</p>
          {aiConfig && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-6 text-sm text-gray-500">
              Last updated: <span className="font-medium text-gray-700">{formatDate(aiConfig.updatedAt)}</span>
            </div>
          )}
          <AIConfigForm initialValues={initialValues} hasExistingKey={!!aiConfig?.apiKey} />
        </section>

        <section id="payment-settings" className="scroll-mt-20">
          <p className="text-sm text-gray-400 mb-6">Configure the active payment gateway and credentials.</p>
          {paymentMigrationMissing && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-6 text-sm text-yellow-800">
              Payment settings table is missing in the database. Run Prisma migrations to enable this section.
            </div>
          )}
          {!paymentMigrationMissing && (
            <PaymentConfigForm initialConfigs={paymentInitialConfigs} />
          )}
        </section>

        <section id="email-settings" className="scroll-mt-20">
          <p className="text-sm text-gray-400 mb-6">Configure the active email provider and credentials.</p>
          {emailMigrationMissing && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-6 text-sm text-yellow-800">
              Email settings table is missing in the database. Run Prisma migrations to enable this section.
            </div>
          )}
          {emailConfig && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-6 text-sm text-gray-500">
              Last updated: <span className="font-medium text-gray-700">{formatDate(emailConfig.updated_at)}</span>
            </div>
          )}
          <EmailConfigForm
            initialValues={emailInitialValues}
            hasExistingApiKey={!!emailConfig?.api_key}
            hasExistingPassword={!!emailConfig?.password}
          />

          <div className="mt-6">
            <EmailQueuePanel initialHealth={emailQueueHealth} initialInsights={emailQueueInsights} />
          </div>

          <SocialLinksEditor initialLinks={socialLinksConfig} />
        </section>

        <section id="site-notice-settings" className="scroll-mt-20">
          <p className="text-sm text-gray-400 mb-6">Configure the top important notice bar shown on public pages.</p>
          <SiteNoticeEditor initialConfig={siteNoticeConfig} />
        </section>
      </div>
    </>
  );
}
