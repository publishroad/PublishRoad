import { Navbar } from "@/components/public/Navbar";
import { Footer } from "@/components/public/Footer";
import { PublicNoticeBar } from "@/components/public/PublicNoticeBar";
import { getSiteNoticeConfig } from "@/lib/site-notice-config";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const siteNoticeConfig = await getSiteNoticeConfig();

  return (
    <>
      <PublicNoticeBar config={siteNoticeConfig} />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
