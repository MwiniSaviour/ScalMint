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
    label: "PORTFOLIO",
    items: [
      { title: "Overview", url: "/admin", icon: <HomeIcon />, items: [] },
      { title: "Projects", url: "/admin/projects", icon: <WindowIcon />, items: [] },
      { title: "Health", url: "/admin/health", icon: <Widget4Icon />, items: [] },
      { title: "Analytics", url: "/admin/analytics", icon: <PieChartIcon />, items: [] },
      { title: "Revenue", url: "/admin/revenue", icon: <TableIcon />, items: [] },
      { title: "Customers", url: "/admin/customers", icon: <UserIcon />, items: [] },
      { title: "Tasks", url: "/admin/task", icon: <TableIcon />, items: [] },
      { title: "Work queue", url: "/admin/work", icon: <AlphabetIcon />, items: [] },
    ],
  },
  {
    label: "PROGRAMME",
    items: [
      { title: "Affiliates", url: "/admin/affiliates", icon: <UserIcon />, items: [] },
      { title: "Commissions", url: "/admin/commissions", icon: <PieChartIcon />, items: [] },
      { title: "Conversions", url: "/admin/conversions", icon: <TableIcon />, items: [] },
      { title: "Products", url: "/admin/programme/products", icon: <Widget4Icon />, items: [] },
    ],
  },
  {
    label: "ORGANISATION",
    items: [
      { title: "Team and access", url: "/admin/team", icon: <UserIcon />, items: [] },
      { title: "Audit log", url: "/admin/audit", icon: <AlphabetIcon />, items: [] },
      { title: "Settings", url: "/admin/settings", icon: <WindowIcon />, items: [] },
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
