import Link from "next/link";
import {
  DemoPage,
  DemoPageBody,
} from "@/components/demo/primitives";

export const dynamic = "force-dynamic";

function MoreButton({ children, ariaLabel }: { children: React.ReactNode; ariaLabel: string }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="inline-flex items-center justify-center size-7 rounded-lg border border-card-border bg-card-background text-text-secondary transition-colors hover:text-text-primary hover:bg-background-gray-secondary_alt focus-visible:ring-2 focus-visible:ring-button-outline-focus-ring focus-visible:ring-offset-2"
    >
      {children}
    </button>
  );
}

function kebabIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-5">
      <path d="M12 11.5a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5ZM12 5.25a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5ZM12 17.75a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5Z" fill="currentColor"></path>
    </svg>
  );
}

function trashIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-5">
      <path d="M5.25 5.75V19.75C5.25 20.5784 5.92157 21.25 6.75 21.25H17.25C18.0784 21.25 18.75 20.5784 18.75 19.75V5.75M4 5.75H19.999M5.25 15.8955V9.89551M18.75 15.8955V9.89551M10 16.5V10.5M14 16.5V10.5M15.2495 5.75V4.25C15.2495 3.42157 14.5779 2.75 13.7495 2.75H10.2495C9.42108 2.75 8.74951 3.42157 8.74951 4.25V5.75H15.2495Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
    </svg>
  );
}

function searchIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-5">
      <path d="M11.3253 2.92485C15.9645 2.92485 19.7256 6.68564 19.7257 11.3243C19.7256 13.374 18.9897 15.2511 17.7697 16.709L20.8556 19.795C21.1483 20.0878 21.1481 20.5626 20.8556 20.8555C20.5627 21.1484 20.0879 21.1484 19.795 20.8555L16.7091 17.7696C15.2511 18.9882 13.3743 19.7227 11.3253 19.7227C6.68631 19.7225 2.92518 15.9627 2.92493 11.3243C2.92507 6.68575 6.68624 2.92503 11.3253 2.92485ZM11.3253 4.42485C7.51438 4.42503 4.42507 7.51446 4.42493 11.3243C4.42518 15.134 7.51445 18.2225 11.3253 18.2227C15.1363 18.2227 18.2255 15.1341 18.2257 11.3243C18.2256 7.51435 15.1364 4.42485 11.3253 4.42485Z" fill="currentColor"></path>
    </svg>
  );
}

function ConversationEmpty() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center p-6">
      <p className="text-sm font-medium text-text-secondary">No conversations yet</p>
      <p className="max-w-xs text-center text-sm leading-5 text-text-tertiary">Start a new chat to begin messaging.</p>
    </div>
  );
}

function FilterButton({ label, active }: { label: string; active: boolean }) {
  return (
    <button
      type="button"
      className={`flex items-center justify-center font-medium transition outline-none data-[focused=true]:ring-4 [&>svg]:text-current! [&>svg]:size-5 disabled:border disabled:border-button-disabled-border disabled:bg-button-disabled-background disabled:text-button-disabled-text hover:bg-button-primary-outline-hover-background focus-visible:ring-2 focus-visible:ring-button-outline-focus-ring focus-visible:ring-offset-2 h-8 gap-1.5 rounded-lg px-5 py-1.5 text-sm text-text-primary hover:text-text-primary ${active ? "bg-background-gray-secondary_alt" : ""}`}
    >
      {label}
    </button>
  );
}

export default function ChatsPage() {
  return (
    <DemoPage>
      <div className="flex flex-col-reverse items-start justify-between gap-3 px-2 sm:flex-row sm:items-center lg:px-6">
        <h1 className="mb-1 text-[28px] leading-8 font-medium text-text-primary">Chats</h1>
        <ol className="flex items-center gap-2">
          <li className="contents text-text-tertiary [&_svg]:text-current!">
            <span className="flex items-center gap-1 text-sm font-medium [&>svg]:size-4">
              Support
            </span>
          </li>
          <li className="contents text-text-tertiary [&_svg]:text-current!">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-4">
              <path d="M9.62 18.25L15.87 12L9.62 5.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
            <Link href="/admin/chats" className="flex items-center gap-1 text-sm font-medium [&>svg]:size-4 text-text-primary">
              Chats
            </Link>
          </li>
        </ol>
      </div>
      <DemoPageBody>
        <section className="px-2 lg:px-6">
          <div className="flex h-[calc(100vh-210px)] min-h-150 w-full overflow-hidden rounded-xl border border-card-border bg-card-background">
            <div className="w-full shrink-0 flex-col border-r border-card-border md:w-87.5 lg:w-95 flex">
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-text-primary">Chats</h2>
                  </div>
                  <div className="flex items-center gap-1">
                    <MoreButton ariaLabel="More Options">{kebabIcon()}</MoreButton>
                    <MoreButton ariaLabel="Delete conversation">{trashIcon()}</MoreButton>
                  </div>
                </div>
                <div className="px-4">
                  <div
                    data-slot="input-group"
                    role="group"
                    className="group flex w-full items-center rounded-lg border border-card-border bg-input-background transition-all focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/20"
                  >
                    <div data-slot="input-group-addon" data-align="inline-start" className="flex shrink-0 items-center justify-center px-3 text-sm text-text-tertiary [&>svg]:size-5 order-first pr-2">
                      {searchIcon()}
                    </div>
                    <input
                      className="peer max-w-full border py-2.5 text-title-50 duration-300 outline-none placeholder:text-text-tertiary disabled:cursor-not-allowed disabled:border-base-100 disabled:text-input-disabled-text disabled:placeholder:text-input-disabled-text border-card-border focus:border-brand-500 focus:ring-brand-500/20 w-full min-w-0 flex-1 rounded-none border-none bg-transparent px-0 shadow-none focus:border-none focus:ring-0"
                      data-slot="input-group-control"
                      placeholder="Search..."
                      name="chat-search"
                    />
                  </div>
                </div>
                <div className="scrollbar-none flex items-center justify-start gap-1.5 overflow-x-auto p-4 pb-0">
                  <FilterButton label="All" active={true} />
                  <FilterButton label="Unread" active={false} />
                  <FilterButton label="Group" active={false} />
                  <FilterButton label="Archive" active={false} />
                </div>
                <div className="mt-8 scrollbar-thin flex-1 space-y-2 overflow-y-auto">
                  <ConversationEmpty />
                </div>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex flex-1 items-center justify-center p-6 text-center">
                <p className="text-text-tertiary">Select a conversation to start messaging</p>
              </div>
            </div>
          </div>
        </section>
      </DemoPageBody>
    </DemoPage>
  );
}
