import Link from "next/link";
import { getSocialLinksConfig } from "@/lib/social-links-config";
import { getSocialPlatformIcon } from "@/lib/social-links-config-shared";

const footerLinks = {
  Product: [
    { href: "/pricing", label: "Pricing" },
    { href: "/hire-us", label: "Hire Us" },
    { href: "/faq", label: "FAQ" },
    { href: "/blog", label: "Blog" },
    { href: "/contact", label: "Contact" },
  ],
  Legal: [
    { href: "/terms", label: "Terms of Service" },
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/refund-policy", label: "Refund Policy" },
    { href: "/cancellation-policy", label: "Cancellation Policy" },
  ],
  Account: [
    { href: "/login", label: "Sign In" },
    { href: "/signup", label: "Create Account" },
    { href: "/dashboard", label: "Dashboard" },
  ],
};

export async function Footer() {
  const socialLinks = (await getSocialLinksConfig()).filter((link) => link.enabled);

  return (
    <footer className="mt-auto relative overflow-hidden" style={{ backgroundColor: "var(--dark)" }}>
      {/* Subtle glow accent */}
      <div
        className="absolute bottom-0 left-1/2 w-[600px] h-64 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, rgba(91,88,246,0.15) 0%, transparent 70%)",
          transform: "translateX(-50%) translateY(40%)",
        }}
      />

      <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link
              href="/"
              className="text-2xl font-bold text-white mb-4 inline-block"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Publish<span style={{ color: "var(--indigo)" }}>Road</span>
            </Link>
            <p className="text-sm text-slate-400 font-light leading-relaxed max-w-xs mt-3">
              AI-powered distribution plans for product launches. Get seen by the right people.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3
                className="font-semibold text-white text-sm uppercase tracking-widest mb-5"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                {category}
              </h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-400 hover:text-white transition-colors font-light"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="border-t pt-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-slate-500"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <p>© {new Date().getFullYear()} PublishRoad. All rights reserved.</p>

          {/* Social icons — center */}
          <div className="flex items-center gap-3">
            {socialLinks.map((s) => {
              const icon = getSocialPlatformIcon(s.platform);

              return (
                <a
                  key={s.id}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="footer-social-icon flex items-center justify-center rounded-full transition-all duration-200"
                >
                  <svg
                    viewBox={icon.viewBox}
                    fill="currentColor"
                    style={{ width: "0.9rem", height: "0.9rem" }}
                  >
                    <path d={icon.path} />
                  </svg>
                </a>
              );
            })}
          </div>

          <p className="font-light">Built for founders who ship.</p>
        </div>
      </div>
    </footer>
  );
}
