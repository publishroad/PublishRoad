export function UserAvatar({ name, email }: { name: string | null; email: string }) {
  const initials = name
    ? name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : email[0].toUpperCase();

  return (
    <div className="w-8 h-8 rounded-full bg-[#EEF2FF] flex items-center justify-center text-xs font-semibold text-[#465FFF] shrink-0">
      {initials}
    </div>
  );
}
