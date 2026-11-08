"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";
import {
  DemoPage,
  DemoPageBody,
  PageHeader,
} from "@/components/demo/primitives";

export const dynamic = "force-dynamic";

function FilterIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M3 6H21M6.27273 11.5L17.7273 11.5M10.6364 17H13.3636" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M11.3253 2.92485C15.9645 2.92485 19.7256 6.68564 19.7257 11.3243C19.7256 13.374 18.9897 15.2511 17.7697 16.709L20.8556 19.795C21.1483 20.0878 21.1481 20.5626 20.8556 20.8555C20.5627 21.1484 20.0879 21.1484 19.795 20.8555L16.7091 17.7696C15.2511 18.9882 13.3743 19.7227 11.3253 19.7227C6.68631 19.7225 2.92518 15.9627 2.92493 11.3243C2.92507 6.68575 6.68624 2.92503 11.3253 2.92485ZM11.3253 4.42485C7.51438 4.42503 4.42507 7.51446 4.42493 11.3243C4.42518 15.134 7.51445 18.2225 11.3253 18.2227C15.1363 18.2227 18.2255 15.1341 18.2257 11.3243C18.2256 7.51435 15.1364 4.42485 11.3253 4.42485Z" fill="currentColor" />
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

function DotsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
      <path d="M6 12.0002H18.0007M12.0002 6V18.0007" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PrimaryButton({ children, className, ariaLabel, onClick }: { children: ReactNode; className?: string; ariaLabel?: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={ariaLabel} onClick={onClick} className={["flex items-center justify-center rounded-lg text-sm font-medium transition outline-none focus:ring-4 bg-button-primary-background text-button-primary-text hover:bg-button-primary-hover-background focus-visible:ring-2 focus-visible:ring-button-primary-focus-ring focus-visible:ring-offset-2 gap-1.5 px-3 py-1.5 h-8", className].filter(Boolean).join(" ")}>
      {children}
    </button>
  );
}

function OutlineButton({ children, className, ariaLabel, onClick }: { children: ReactNode; className?: string; ariaLabel?: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={ariaLabel} onClick={onClick} className={["flex items-center justify-center rounded-lg text-sm font-medium transition outline-none focus:ring-4 border border-button-primary-outline-stroke bg-button-primary-outline-background text-button-primary-outline-text hover:text-button-primary-outline-hover-text hover:bg-button-primary-outline-hover-background focus-visible:ring-2 focus-visible:ring-button-outline-focus-ring focus-visible:ring-offset-2 gap-1.5 px-3 py-1.5 h-8", className].filter(Boolean).join(" ")}>
      {children}
    </button>
  );
}

function IconOutlineButton({ children, className, ariaLabel, onClick }: { children: ReactNode; className?: string; ariaLabel: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={ariaLabel} onClick={onClick} className={["flex items-center justify-center rounded-lg text-sm font-medium transition outline-none focus:ring-4 border border-button-primary-outline-stroke bg-button-primary-outline-background hover:bg-button-primary-outline-hover-background focus-visible:ring-2 focus-visible:ring-button-outline-focus-ring focus-visible:ring-offset-2 [&>svg]:text-current! [&>svg]:size-5 size-8.5", className].filter(Boolean).join(" ")}>
      {children}
    </button>
  );
}

function MenuButton({ children, ariaLabel, onClick }: { children: ReactNode; ariaLabel?: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={ariaLabel ?? "Column menu"} onClick={onClick} className={["flex items-center justify-center rounded-lg text-sm font-medium transition outline-none [&>svg]:text-current! [&>svg]:size-4 disabled:border disabled:border-button-disabled-border disabled:bg-button-disabled-background disabled:text-button-disabled-text focus-visible:ring-2 focus-visible:ring-button-outline-focus-ring focus-visible:ring-offset-2 size-7 text-text-primary hover:bg-background-gray-primary hover:text-text-primary", ""].filter(Boolean).join(" ")}>
      {children}
    </button>
  );
}

const COLUMNS = ["To Do", "In Progress", "Review", "Complete"] as const;

export default function Page() {
  const [selected, setSelected] = useState<(typeof COLUMNS)[number] | "ALL">("ALL");

  const addTaskDisabledMessage = "Task storage is not connected yet — tasks you add can’t be saved.";

  return (
    <DemoPage>
      <PageHeader title="Task Kanban" subtitle="Organize tasks across a Kanban board by status." />
      <DemoPageBody>
        <div className="flex items-center justify-between">
          <div className="w-40 lg:hidden">
            <select
              aria-label="Kanban column filter (mobile)"
              value={selected}
              onChange={(e) => setSelected(e.target.value as (typeof COLUMNS)[number] | "ALL")}
              className="flex w-full items-center rounded-lg font-medium outline-none focus-visible:ring-2 focus-visible:ring-button-outline-focus-ring border border-border-secondary-alt bg-background-gray-secondary_alt px-3 py-3 shadow-none"
            >
              <option value="ALL">All Task</option>
              {COLUMNS.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div role="tablist" aria-label="Kanban column filter" className="hidden flex-wrap items-center gap-1.5 rounded-lg bg-background-gray-secondary_alt p-1 lg:flex">
            {(["ALL", "To Do", "In Progress", "Review", "Complete"] as const).map((status) => (
              <button
                key={status}
                role="tab"
                aria-selected={status === selected}
                type="button"
                onClick={() => setSelected(status)}
                className={`rounded-md px-3 py-1 text-sm font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-button-outline-focus-ring focus-visible:ring-offset-2 ${status === selected ? "bg-card-background text-text-primary shadow-xs" : "text-text-secondary hover:text-text-primary"}`}
              >
                {status === "ALL" ? "All" : status}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 border-border-secondary-alt md:border-r-2 md:pr-3">
              <IconOutlineButton
                ariaLabel="Search tasks"
                className="text-text-primary"
                onClick={() => toast.info("No tasks stored yet — search will be available once task data is connected.")}
              >
                <SearchIcon />
              </IconOutlineButton>
            </div>
            <IconOutlineButton ariaLabel="Filter tasks" className="text-text-primary md:hidden" onClick={() => setSelected("ALL")}>
              <FilterIcon />
            </IconOutlineButton>
            <OutlineButton ariaLabel="Filter tasks (reset to all columns)" className="hidden py-2 md:flex" onClick={() => setSelected("ALL")}>
              <FilterIcon />
              <span>Filter</span>
            </OutlineButton>
            <IconOutlineButton ariaLabel="Add Task" className="md:hidden" onClick={() => toast.info(addTaskDisabledMessage)}>
              <PlusIcon />
            </IconOutlineButton>
            <PrimaryButton className="hidden md:flex" ariaLabel="Add Task" onClick={() => toast.info(addTaskDisabledMessage)}>
              <PlusIcon />
              <span>Add Task</span>
            </PrimaryButton>
          </div>
        </div>
        <section className="mt-5 scrollbar-thin scrollbar-thumb-border-secondary-alt scrollbar-track-transparent overflow-x-auto p-0 pb-6">
          <div className="flex min-w-max gap-5 pb-2">
            {COLUMNS.filter((title) => selected === "ALL" || title === selected).map((title) => (
              <div key={title} className="flex min-h-155 max-w-85 min-w-70 flex-1 flex-col rounded-xl bg-background-gray-secondary_alt_2 p-2 transition-all duration-200">
                <div className="flex items-center justify-between p-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-gray-400" aria-hidden="true"></span>
                    <h2 className="text-sm leading-5 font-semibold tracking-[-0.15px] text-text-primary">{title}</h2>
                  </div>
                  <div className="flex items-center">
                    <MenuButton ariaLabel={`Options for ${title} column`} onClick={() => toast.info(`Column options for ${title} aren’t available yet.`)}>
                      <DotsIcon />
                    </MenuButton>
                  </div>
                </div>
                <div className="mt-2 flex flex-1 flex-col gap-2 transition-all duration-200">
                  <p className="text-xs text-text-tertiary">No tasks</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </DemoPageBody>
    </DemoPage>
  );
}
