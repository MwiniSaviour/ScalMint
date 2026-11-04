import type { ReactNode } from "react";
import {
  AlphabetIcon,
  HomeIcon,
  PieChartIcon,
  TableIcon,
  UserIcon,
  Widget4Icon,
  WindowIcon,
  CalendarIcon,
  LayoutGridIcon,
  UsersIcon,
  ListTodoIcon,
  MessageSquareIcon,
  MailIcon,
  FileTextIcon,
} from "./icon";

export type NavChild = { title: string; url?: string };
export type NavItem = {
  title: string;
  url?: string;
  icon: ReactNode;
  items: NavChild[];
};
export type NavSection = { label: string; items: NavItem[] };

export const PORTFOLIO_NAV: NavSection[] = [
  {
    label: "MAIN MENU",
    items: [
      {
        title: "Dashboard",
        icon: <LayoutGridIcon />,
        items: [
          { title: "E-commerce", url: "/admin" },
          { title: "Analytics", url: "/admin/analytics" },
          { title: "Marketing", url: "/admin/marketing" },
          { title: "CRM", url: "/admin/customers" },
          { title: "Stocks", url: "/admin/stocks" },
          { title: "AI", url: "/admin/ai" },
          { title: "SaaS", url: "/admin/saas" },
        ],
      },
      { title: "Calendar", url: "/admin/calendar", icon: <CalendarIcon />, items: [] },
      { title: "Manage Team", url: "/admin/team", icon: <UsersIcon />, items: [] },
      { title: "Task", url: "/admin/task", icon: <ListTodoIcon />, items: [] },
    ],
  },
  {
    label: "SUPPORT",
    items: [
      { title: "Chats", url: "/admin/chats", icon: <MessageSquareIcon />, items: [] },
      { title: "Email", url: "/admin/email", icon: <MailIcon />, items: [] },
      {
        title: "Invoice",
        icon: <FileTextIcon />,
        items: [
          { title: "Payment", url: "/admin/invoice/payment" },
          { title: "Business", url: "/admin/invoice/business" },
        ],
      },
    ],
  },
];

export function projectNav(key: string): NavSection[] {
  const p = `/admin/p/${key}`;
  return [
    {
      label: "PROJECT",
      items: [
        { title: "Overview", url: p, icon: <HomeIcon />, items: [] },
        { title: "Health", url: `${p}/health`, icon: <Widget4Icon />, items: [] },
        { title: "Analytics", url: `${p}/analytics`, icon: <PieChartIcon />, items: [] },
        { title: "Revenue", url: `${p}/revenue`, icon: <TableIcon />, items: [] },
        { title: "Customers", url: `${p}/customers`, icon: <UserIcon />, items: [] },
        { title: "Pipeline", url: `${p}/pipeline`, icon: <WindowIcon />, items: [] },
        { title: "Marketing", url: `${p}/marketing`, icon: <PieChartIcon />, items: [] },
        { title: "Calendar", url: `${p}/calendar`, icon: <CalendarIcon />, items: [] },
        { title: "Tasks", url: `${p}/tasks`, icon: <TableIcon />, items: [] },
        { title: "Assets", url: `${p}/assets`, icon: <WindowIcon />, items: [] },
        { title: "Settings", url: `${p}/settings`, icon: <AlphabetIcon />, items: [] },
      ],
    },
  ];
}

export const PROJECT_SECTIONS = [
  "health",
  "analytics",
  "revenue",
  "customers",
  "pipeline",
  "marketing",
  "calendar",
  "tasks",
  "assets",
  "settings",
] as const;

export function navForPath(pathname: string): NavSection[] {
  const match = pathname.match(/^\/admin\/p\/([^/]+)/);
  if (match?.[1]) return projectNav(match[1]);
  return PORTFOLIO_NAV;
}

/** @deprecated kit search still imports NAV_DATA — portfolio only, command palette adds projects live. */
export const NAV_DATA = PORTFOLIO_NAV;
