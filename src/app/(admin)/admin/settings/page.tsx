// Cache settings for 300 seconds — form-based, changes are infrequent
export const revalidate = 300;

import { db } from "@/lib/db";
import { AIConfigForm } from "@/components/admin/AIConfigForm";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { formatDate } from "@/lib/utils";

export default async function AdminSettingsPage() {
  const config = await db.aiConfig.findUnique({ where: { id: "default" } });
  const initialValues = config ? { baseUrl: config.baseUrl, apiKey: "", modelName: config.modelName, maxTokens: config.maxTokens, temperature: config.temperature } : null;

  return (
    <>
      <AppHeader title="AI Settings" />
      <div className="flex-1 p-6 max-w-2xl">
        <p className="text-sm text-gray-400 mb-6">Configure the AI model used for curation matching.</p>
        {config && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-6 text-sm text-gray-500">
            Last updated: <span className="font-medium text-gray-700">{formatDate(config.updatedAt)}</span>
          </div>
        )}
        <AIConfigForm initialValues={initialValues} hasExistingKey={!!config?.apiKey} />
      </div>
    </>
  );
}
