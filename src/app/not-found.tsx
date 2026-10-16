import Link from "next/link";
import { Container, ButtonLink } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-page px-6 py-32">
      <Container className="max-w-[720px]">
        <p className="t-eyebrow mb-6 text-eyebrow">404</p>
        <h1 className="t-h2-mobile md:t-h2 text-hi">
          That page isn&apos;t here.
        </h1>
        <p className="t-body-lg mt-6 max-w-[560px] text-body">
          The link may be out of date. Everything ScalMint publishes today lives on
          the homepage.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-2">
          <ButtonLink href="/">Back to home</ButtonLink>
          <Link
            href="/contact"
            className="btn-base btn-ghost hover:btn-ghost-hover"
          >
            Start a project
          </Link>
        </div>
      </Container>
    </main>
  );
}