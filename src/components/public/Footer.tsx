import Link from "next/link";

const socialLinks = [
  {
    label: "X / Twitter",
    href: "https://x.com/publishroad",
    viewBox: "0 0 24 24",
    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.258 5.63 5.906-5.63Zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com/company/publishroad",
    viewBox: "0 0 24 24",
    path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  },
  {
    label: "Instagram",
    href: "https://instagram.com/publishroad",
    viewBox: "0 0 24 24",
    path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z",
  },
  {
    label: "ProductHunt",
    href: "https://producthunt.com",
    viewBox: "0 0 24 24",
    path: "M13.604 8.4h-3.405V12h3.405a1.8 1.8 0 0 0 0-3.6M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0m1.604 14.4h-3.405V18H7.8V6h5.804a4.2 4.2 0 0 1 0 8.4",
  },
];

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
  ],
  Account: [
    { href: "/login", label: "Sign In" },
    { href: "/signup", label: "Create Account" },
    { href: "/dashboard", label: "Dashboard" },
  ],
};

export function Footer() {
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
            {socialLinks.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="footer-social-icon flex items-center justify-center rounded-full transition-all duration-200"
              >
                <svg viewBox={s.viewBox} fill="currentColor" style={{ width: "0.9rem", height: "0.9rem" }}>
                  <path d={s.path} />
                </svg>
              </a>
            ))}
          </div>

          <p className="font-light">Built for founders who ship.</p>
        </div>
      </div>
    </footer>
  );
}
