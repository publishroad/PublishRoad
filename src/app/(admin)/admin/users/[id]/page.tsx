// Cache user details for 60 seconds — admin changes are infrequent
export const revalidate = 0;

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { UserAdminPanel } from "@/components/admin/UserAdminPanel";
import { formatDate } from "@/lib/utils";

type AffiliateProfileRow = {
  starterCommissionPct: number;
  hireUsCommissionPct: number;
  paypalEmail: string | null;
};

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [user, plans, curations, affiliateProfileRows] = await Promise.all([
    db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        authProvider: true,
        emailVerifiedAt: true,
        planId: true,
        creditsRemaining: true,
      },
    }),
    db.planConfig.findMany({ where: { isActive: true }, orderBy: { priceCents: "asc" } }),
    db.curation.count({ where: { userId: id } }),
    db.$queryRaw<AffiliateProfileRow[]>`
      SELECT
        starter_commission_pct AS "starterCommissionPct",
        hire_us_commission_pct AS "hireUsCommissionPct",
        paypal_email AS "paypalEmail"
      FROM affiliate_profiles
      WHERE user_id = ${id}
      LIMIT 1
    `,
  ]);

  if (!user) notFound();

  const affiliateProfile = affiliateProfileRows[0] ?? {
    starterCommissionPct: 25,
    hireUsCommissionPct: 15,
    paypalEmail: null,
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-white border-b border-border-gray px-6 py-4">
        <h1 className="text-lg font-semibold text-navy">User: {user.name ?? user.email}</h1>
        <p className="text-sm text-medium-gray">ID: {user.id}</p>
      </div>

      <div className="flex-1 p-6 max-w-3xl space-y-6">
        {/* Summary */}
        <div className="bg-white rounded-xl border border-border-gray p-6">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-medium-gray">Email</dt>
              <dd className="font-medium text-dark-gray">{user.email}</dd>
            </div>
            <div>
              <dt className="text-medium-gray">Joined</dt>
              <dd className="font-medium text-dark-gray">{formatDate(user.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-medium-gray">Auth Provider</dt>
              <dd className="capitalize font-medium text-dark-gray">{user.authProvider}</dd>
            </div>
            <div>
              <dt className="text-medium-gray">Curations</dt>
              <dd className="font-medium text-dark-gray">{curations}</dd>
            </div>
            <div>
              <dt className="text-medium-gray">Email Verified</dt>
              <dd className={user.emailVerifiedAt ? "text-success font-medium" : "text-error font-medium"}>
                {user.emailVerifiedAt ? formatDate(user.emailVerifiedAt) : "Not verified"}
              </dd>
            </div>
          </dl>
        </div>

        <UserAdminPanel user={user} plans={plans} affiliateProfile={affiliateProfile} />
      </div>
    </div>
  );
}
