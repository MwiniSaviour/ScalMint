import {
  CardHead,
  DemoCard,
  DemoPage,
  DemoPageBody,
} from "@/components/demo/primitives";

export const dynamic = "force-dynamic";

function MailEmpty({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center p-6">
      <p className="text-sm font-medium text-text-secondary">{title}</p>
      <p className="max-w-xs text-center text-sm leading-5 text-text-tertiary">{body}</p>
    </div>
  );
}

export default function EmailPage() {
  return (
    <DemoPage>
      <div className="flex flex-col-reverse items-start justify-between gap-3 px-2 sm:flex-row sm:items-center lg:px-6">
        <h1 className="mb-1 text-[28px] leading-8 font-medium text-text-primary">Email</h1>
        <ol className="flex items-center gap-2">
          <li className="contents text-text-tertiary [&_svg]:text-current!">
            <a className="flex items-center gap-1 text-sm font-medium [&>svg]:size-4" href="#">
              Support
            </a>
          </li>
          <li className="contents text-text-tertiary [&_svg]:text-current!">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-4">
              <path d="M9.62 18.25L15.87 12L9.62 5.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
            <a className="flex items-center gap-1 text-sm font-medium [&>svg]:size-4 text-text-primary" href="/admin/email">
              Email
            </a>
          </li>
        </ol>
      </div>
      <DemoPageBody>
        <section className="px-2 lg:px-6">
          <DemoCard>
            <CardHead title="Inbox" />
            <MailEmpty title="No emails yet" body="ScalMint doesn't track email yet." />
          </DemoCard>
        </section>
      </DemoPageBody>
    </DemoPage>
  );
}
