import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { EmailVerificationBanner } from "@/components/dashboard/EmailVerificationBanner";
import { Providers } from "@/components/providers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard");
  }

  return (
    <Providers session={session}>
      <div className="flex min-h-screen bg-gray-50">
        <DashboardSidebar session={session} />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <EmailVerificationBanner
            initialUserId={session.user.id}
            initialIsEmailVerified={session.user.isEmailVerified}
          />
          {children}
        </main>
      </div>
    </Providers>
  );
}
