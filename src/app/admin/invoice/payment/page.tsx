import { DemoPage, DemoPageBody } from "@/components/demo/primitives";
import Link from "next/link";
import InvoiceBuilder from "../invoice-builder";

export const dynamic = "force-dynamic";

export default function InvoicePaymentPage() {
  return (
    <DemoPage>
      <div className="flex flex-col-reverse justify-between gap-3 px-2 md:flex-row md:items-center print:hidden lg:px-6">
        <h1 className="mb-1 text-[28px] leading-8 font-medium text-text-primary">Payment Invoice</h1>
        <ol className="flex items-center gap-1 md:gap-2">
          <li className="contents text-text-tertiary [&_svg]:text-current!">
            <Link href="/admin/invoice/business" className="flex items-center gap-1 text-sm font-medium [&>svg]:size-4 hover:text-text-primary">
              Invoice
            </Link>
          </li>
          <li className="contents text-text-tertiary [&_svg]:text-current!">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-4">
              <path d="M9.62 18.25L15.87 12L9.62 5.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
            <Link href="/admin/invoice/payment" className="flex items-center gap-1 text-sm font-medium [&>svg]:size-4 text-text-primary">
              Payment Invoice
            </Link>
          </li>
        </ol>
      </div>
      <DemoPageBody>
        <InvoiceBuilder
          variant="payment"
          tabs={[
            { label: "Payment", href: "/admin/invoice/payment", active: true },
            { label: "Business", href: "/admin/invoice/business", active: false },
          ]}
        />
      </DemoPageBody>
    </DemoPage>
  );
}
