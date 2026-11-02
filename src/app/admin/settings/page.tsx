export default function SettingsPage() {
  return (
    <div className="mt-6 space-y-5 px-2 lg:px-6">
      <h1 className="text-[28px] font-medium">Settings</h1>
      <p className="text-sm text-text-tertiary">
        Portfolio integrations, alert channels, and retention. Alert channels in v1 are email and webhook for P1.
      </p>
      <section className="rounded-xl border border-card-border p-5 text-sm">
        <h2 className="font-medium">Retention</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-text-secondary">
          <li>Raw probe runs: 90 days</li>
          <li>Hourly/daily rollups: 25 months</li>
          <li>Audit: 7 years</li>
        </ul>
      </section>
      <section className="rounded-xl border border-card-border p-5 text-sm">
        <h2 className="font-medium">Probe runner</h2>
        <p className="mt-2 text-text-secondary">
          Runs on the VPS via <code className="font-mono">npm run ops:probe</code> (pm2), not inside the Next.js request path.
          Console self-health is the <span className="font-mono">scalmint-ops</span> project.
        </p>
      </section>
    </div>
  );
}
