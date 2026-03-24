import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Image from "next/image";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ backgroundColor: "var(--background)" }}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-mesh pointer-events-none" />
      <div className="absolute inset-0 bg-dot-grid opacity-20 pointer-events-none" />

      {/* Logo bar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <Image src="/logo.png" alt="PublishRoad" width={140} height={40} sizes="140px" style={{ height: "auto" }} />
      </div>

      <div className="relative z-10">{children}</div>
    </div>
  );
}
