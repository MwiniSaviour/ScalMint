import type { Metadata } from "next";
import { MarketingShell } from "@/components/layout/MarketingShell";
import { ContactForm } from "@/components/marketing/ContactForm";
import { Container, Eyebrow } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Start a project",
  description: "Tell ScalMint what needs building. Accra team, written scope, Paystack invoicing.",
  alternates: { canonical: "https://scalmint.com/contact" },
};

export default function ContactPage() {
  return (
    <MarketingShell>
      <main>
        <section className="border-b border-line bg-page">
          <Container className="py-[72px] md:py-[96px]">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.1fr]">
              <div>
                <Eyebrow>Start a project</Eyebrow>
                <h1 className="t-h2-mobile md:t-h2 mt-4 text-hi">Bring us the problem.</h1>
                <p className="t-body-lg mt-5 max-w-[480px] text-body">
                  A named lead in Accra reads every enquiry. If it is a fit, you get a 2–3 week discovery quote — not a deck.
                </p>
                <ul className="mt-8 space-y-2 text-[13px] leading-[1.6] text-muted">
                  <li>hello@scalmint.com</li>
                  <li>Accra, Ghana · Mon–Fri</li>
                  <li>Response within one working day</li>
                </ul>
              </div>
              <ContactForm />
            </div>
          </Container>
        </section>
      </main>
    </MarketingShell>
  );
}
