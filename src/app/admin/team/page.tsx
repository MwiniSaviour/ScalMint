import type { ReactNode } from "react";
import {
  DemoCard,
  DemoPage,
  DemoPageBody,
  PageHeader,
} from "@/components/demo/primitives";

export const dynamic = "force-dynamic";

function SearchIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M11.3253 2.92485C15.9645 2.92485 19.7256 6.68564 19.7257 11.3243C19.7256 13.374 18.9897 15.2511 17.7697 16.709L20.8556 19.795C21.1483 20.0878 21.1481 20.5626 20.8556 20.8555C20.5627 21.1484 20.0879 21.1484 19.795 20.8555L16.7091 17.7696C15.2511 18.9882 13.3743 19.7227 11.3253 19.7227C6.68631 19.7225 2.92518 15.9627 2.92493 11.3243C2.92507 6.68575 6.68624 2.92503 11.3253 2.92485ZM11.3253 4.42485C7.51438 4.42503 4.42507 7.51446 4.42493 11.3243C4.42518 15.134 7.51445 18.2225 11.3253 18.2227C15.1363 18.2227 18.2255 15.1341 18.2257 11.3243C18.2256 7.51435 15.1364 4.42485 11.3253 4.42485Z" fill="currentColor" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M3 6H21M6.27273 11.5L17.7273 11.5M10.6364 17H13.3636" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M6 12.0002H18.0007M12.0002 6V18.0007" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PrimaryButton({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <button type="button" className={["flex items-center justify-center rounded-lg text-sm font-medium transition outline-none focus:ring-4 bg-button-primary-background text-button-primary-text hover:bg-button-primary-hover-background focus-visible:ring-2 focus-visible:ring-button-primary-focus-ring focus-visible:ring-offset-2 gap-1.5 px-3 py-1.5 h-9", className].filter(Boolean).join(" ")}>
      {children}
    </button>
  );
}

function OutlineButton({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <button type="button" className={["flex items-center justify-center rounded-lg text-sm font-medium transition outline-none focus:ring-4 border border-button-primary-outline-stroke bg-button-primary-outline-background text-button-primary-outline-text hover:text-button-primary-outline-hover-text hover:bg-button-primary-outline-hover-background focus-visible:ring-2 focus-visible:ring-button-outline-focus-ring focus-visible:ring-offset-2 gap-1.5 px-3 py-1.5 h-9", className].filter(Boolean).join(" ")}>
      {children}
    </button>
  );
}

export default function Page() {
  const columns = ["ID", "Name", "Email", "Email Verified", "Role", "Joined At", "Action"];
  return (
    <DemoPage>
      <PageHeader title="Manage Team" subtitle="Manage team members, roles, and access across the organization." />
      <DemoPageBody>
        <DemoCard className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-primary px-5 py-4">
            <div className="group flex w-full items-center rounded-lg border border-card-border bg-input-background h-9 max-w-70.5">
              <div className="flex shrink-0 items-center justify-center px-3 text-sm order-first pr-0 text-icon-tertiary">
                <SearchIcon />
              </div>
              <input
                type="text"
                className="peer max-w-full border py-2.5 text-title-50 outline-none placeholder:text-input-placeholder-text disabled:cursor-not-allowed disabled:border-base-100 disabled:text-input-disabled-text disabled:placeholder:text-input-disabled-text border-card-border focus:border-input-primary-focus-border focus:ring-input-primary-focus-border/20 w-full min-w-0 flex-1 rounded-none border-none bg-transparent px-0 shadow-none pl-2 text-sm"
                placeholder="Search by id, name, or email..."
              />
            </div>
            <div className="flex items-center gap-2.5">
              <OutlineButton>
                <FilterIcon />
                <span>Filter</span>
              </OutlineButton>
              <PrimaryButton>
                <PlusIcon />
                <span>Add Member</span>
              </PrimaryButton>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 overflow-clip border-border-primary text-left border w-full rounded-none border-none">
              <thead className="text-title-50 [&_th]:border-b [&_th]:border-border-primary [&_th]:text-xs">
                <tr className="not-last:*:border-border-primary not-last:[&_>td]:border-b not-last:[_>th]:border-b bg-transparent [_th]:border-t">
                  {columns.map((col) => (
                    <th key={col} className={["px-6 py-4 text-sm font-medium whitespace-nowrap text-text-tertiary select-none", col === "Action" ? "w-[92px]" : ""].filter(Boolean).join(" ")}>
                      <span className="inline-flex items-center gap-2 text-sm">{col}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="text-sm font-medium text-text-secondary">No members</p>
                    <p className="mt-1 text-sm text-text-tertiary">No team members have been added yet. Invite team members to appear here.</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </DemoCard>
      </DemoPageBody>
    </DemoPage>
  );
}
