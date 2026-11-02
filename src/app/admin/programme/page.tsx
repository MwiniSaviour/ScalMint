import Link from "next/link";

const links = [
  { href: "/admin/affiliates", title: "Affiliates", body: "Approve, suspend, reject members." },
  { href: "/admin/commissions", title: "Commissions", body: "Product rates. Basis points or pesewas." },
  { href: "/admin/conversions", title: "Conversions", body: "Override the 7-day window when needed." },
  { href: "/admin/programme/products", title: "Products", body: "Affiliate product catalogue." },
];

export default function ProgrammePage() {
  return (
    <div className="mt-6 space-y-5 px-2 lg:px-6">
      <h1 className="text-[28px] font-medium">Affiliate programme</h1>
      <p className="text-sm text-text-tertiary">
        Existing engine remains the system of record. The console does not duplicate commission rows into attribution facts.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="rounded-xl border border-card-border p-5 hover:bg-background-gray-primary">
            <p className="font-medium">{l.title}</p>
            <p className="mt-1 text-sm text-text-tertiary">{l.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
