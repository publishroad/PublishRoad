// Cache user details for 60 seconds — admin changes are infrequent
export const revalidate = 0;

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { UserAdminPanel } from "@/components/admin/UserAdminPanel";
import { formatDate } from "@/lib/utils";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [user, plans, curations] = await Promise.all([
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
  ]);

  if (!user) notFound();

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

        <UserAdminPanel user={user} plans={plans} />
      </div>
    </div>
  );
}
