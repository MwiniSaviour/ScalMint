import Link from "next/link";

const tabs = [
  { href: "/admin/profile/account", title: "Account" },
  { href: "/admin/profile/security", title: "Security" },
  { href: "/admin/profile/notification", title: "Notifications" },
];

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 px-2 lg:px-6">
      <h1 className="text-[28px] font-medium">Profile</h1>
      <nav className="mt-4 flex gap-3 border-b border-card-border pb-2 text-sm">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className="text-text-secondary hover:text-text-primary">
            {t.title}
          </Link>
        ))}
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}
