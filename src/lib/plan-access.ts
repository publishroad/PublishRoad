import { db } from "@/lib/db";
import { CacheTTL, getCachedWithLock } from "@/lib/cache";
import { isMissingRelationError } from "@/lib/db-error-utils";

const FREE_PLAN_FULL_ACCESS_KEY = "launch:free-plan:full-access";

export async function getFreePlanFullAccessEnabled(): Promise<boolean> {
  return getCachedWithLock(FREE_PLAN_FULL_ACCESS_KEY, CacheTTL.PLAN, async () => {
    try {
      const config = await db.betaConfig.findUnique({ where: { id: "default" } });
      return config?.enabled ?? false;
    } catch (error) {
      if (isMissingRelationError(error, "beta_config")) {
        return false;
      }
      throw error;
    }
  });
}

export async function resolveEffectivePlanSlug(planSlug: string): Promise<string> {
  if (planSlug !== "free") return planSlug;
  const freePlanFullAccessEnabled = await getFreePlanFullAccessEnabled();
  return freePlanFullAccessEnabled ? "pro" : "free";
}
