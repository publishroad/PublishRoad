import Image from "next/image";
import Link from "next/link";
import { NavbarClient } from "@/components/public/NavbarClient";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/hire-us", label: "Hire Us" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 glass border-b border-white/40">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            <Image src="/logo.png" alt="PublishRoad" width={140} height={40} sizes="140px" style={{ height: "auto" }} priority />
          </Link>

          <nav className="hidden lg:flex items-center">
            <div className="flex items-center gap-1 bg-white/60 border border-white/80 rounded-full px-2 py-1 shadow-sm">
              {navLinks.map((link) => (
                <Link
                  key={`${link.href}-${link.label}`}
                  href={link.href}
                  className="px-4 py-1.5 rounded-full text-sm font-medium text-slate-600 hover:text-dark hover:bg-white transition-all duration-200"
                  style={{ textDecoration: "none" }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>

          <NavbarClient navLinks={navLinks} />
        </div>
      </div>
    </header>
  );
}
