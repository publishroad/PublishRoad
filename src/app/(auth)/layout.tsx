// Auth routes are protected by proxy.ts — no dynamic rendering needed

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
