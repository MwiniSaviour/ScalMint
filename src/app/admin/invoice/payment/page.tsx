import {
  CardHead,
  DemoCard,
  DemoPage,
  DemoPageBody,
} from "@/components/demo/primitives";

export const dynamic = "force-dynamic";

function TabButton({ label, active }: { label: string; active: boolean }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`flex items-center gap-2 px-3 text-sm font-medium whitespace-nowrap text-text-100 [&>svg]:size-5 [&>svg]:text-current! py-4 outline-none focus-visible:ring-2 focus-visible:ring-button-outline-focus-ring focus-visible:ring-offset-2 ${active ? "border-b-2 border-brand-500 text-brand-500" : "text-text-tertiary hover:text-text-primary"}`}
    >
      {label}
    </button>
  );
}

function InvoiceInput({ label, type, placeholder, id }: { label: string; type?: string; placeholder: string; id: string }) {
  return (
    <div className="flex flex-col w-full">
      <label className="block text-sm font-medium text-text-secondary" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type ?? "text"}
        placeholder={placeholder}
        className="peer mt-1 w-full rounded-lg border border-border-secondary-alt bg-card-background px-2.5 py-2 text-sm text-title-50 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none disabled:cursor-not-allowed disabled:border-base-100 disabled:text-input-disabled-text"
      />
    </div>
  );
}

function InvoiceItemsEmpty() {
  return (
    <div className="flex items-center justify-center gap-2 py-6 text-center">
      <p className="text-sm text-text-tertiary">No invoice items yet</p>
    </div>
  );
}

function TotalsEmpty() {
  return (
    <div className="flex flex-col gap-2 pt-4 border-t border-border-secondary-alt">
      <div className="flex justify-between text-sm text-text-secondary">
        <span>Subtotal</span>
        <span className="text-text-primary">No data</span>
      </div>
      <div className="flex justify-between text-sm text-text-secondary">
        <span>Tax</span>
        <span className="text-text-primary">No data</span>
      </div>
      <div className="flex justify-between text-base font-semibold text-text-primary">
        <span>Total</span>
        <span>No data</span>
      </div>
    </div>
  );
}

export default function InvoicePaymentPage() {
  return (
    <DemoPage>
      <div className="no-print flex flex-col-reverse justify-between gap-3 px-2 md:flex-row md:items-center lg:px-6">
        <h1 className="mb-1 text-[28px] leading-8 font-medium text-text-primary">Payment Invoice</h1>
        <ol className="flex items-center gap-1 md:gap-2">
          <li className="contents text-text-tertiary [&_svg]:text-current!">
            <a className="flex items-center gap-1 text-sm font-medium [&>svg]:size-4" href="#">
              Invoice
            </a>
          </li>
          <li className="contents text-text-tertiary [&_svg]:text-current!">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-4">
              <path d="M9.62 18.25L15.87 12L9.62 5.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
            <a className="flex items-center gap-1 text-sm font-medium [&>svg]:size-4 text-text-primary" href="/admin/invoice/payment">
              Payment Invoice
            </a>
          </li>
        </ol>
      </div>
      <DemoPageBody>
        <section className="px-2 lg:px-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:px-6">
            <div className="no-print space-y-6 lg:col-span-5">
              <div className="max-w-full rounded-xl border border-card-border w-full bg-card-background p-4">
                <div className="max-sm:w-full border-b border-card-border [&>div]:w-full">
                  <div role="tablist" className="overflow-x-auto overflow-y-hidden flex gap-4">
                    <TabButton label="Invoice" active={false} />
                    <TabButton label="Payment" active={true} />
                    <TabButton label="Business" active={false} />
                  </div>
                </div>
                <div className="px-4 py-6">
                  <div role="tabpanel" id="invoice-payment-content-payment" aria-labelledby="tab-payment" className="text-sm font-normal text-text-100 space-y-6 p-0">
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <InvoiceInput label="Reference Number" placeholder="Invoice #" id="payment-reference-number" />
                        <InvoiceInput label="Issued Date" type="date" placeholder="Issue date" id="payment-issued-date" />
                      </div>
                      <div className="space-y-4 border-t border-border-secondary-alt pt-4">
                        <h3 className="text-sm font-semibold text-text-primary">Billed To (Client Details)</h3>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <InvoiceInput label="Client Name" placeholder="Client name" id="payment-client-name" />
                          <InvoiceInput label="Client Email" type="email" placeholder="client@example.com" id="payment-client-email" />
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <InvoiceInput label="Client Phone" type="tel" placeholder="+1 (555) 000-0000" id="payment-client-phone" />
                          <InvoiceInput label="Client Website" type="url" placeholder="https://example.com" id="payment-client-website" />
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <InvoiceInput label="Client Address" placeholder="Street, City" id="payment-client-address" />
                          <InvoiceInput label="Client Tax ID" placeholder="Tax ID" id="payment-client-tax-id" />
                        </div>
                      </div>
                      <div className="space-y-3 border-t border-border-secondary-alt pt-4">
                        <h3 className="text-sm font-semibold text-text-primary">Invoice Items</h3>
                        <InvoiceItemsEmpty />
                        <button type="button" className="flex items-center justify-center gap-1.5 rounded-lg border border-card-border bg-card-background px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-background-gray-secondary_alt focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
                          Add Item
                        </button>
                      </div>
                      <TotalsEmpty />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-7">
              <div className="no-print flex items-center justify-between gap-3 border-b border-card-border bg-card-background p-4">
                <span className="text-sm font-medium text-text-secondary">Live Preview</span>
                <button type="button" className="flex items-center justify-center rounded-lg font-medium transition outline-none focus:ring-4 data-[focused=true]:ring-4 [&>svg]:text-current! [&>svg]:size-5 border disabled:border disabled:border-button-disabled-border disabled:bg-button-disabled-background disabled:text-button-disabled-text hover:text-button-primary-outline-hover-text bg-button-primary-outline-background text-button-primary-outline-text focus:ring-button-outline-focus-ring data-[focused=true]:ring-button-outline-focus-ring gap-1.5 h-9.5 border-border-secondary-alt px-4 py-2 text-sm hover:bg-background-gray-secondary_alt">
                  Print / Save PDF
                </button>
              </div>
              <div className="-mt-12 scale-[80%] flex items-center justify-center min-h-[400px] text-center">
                <p className="text-text-tertiary">No invoice to preview</p>
              </div>
            </div>
          </div>
        </section>
      </DemoPageBody>
    </DemoPage>
  );
}
