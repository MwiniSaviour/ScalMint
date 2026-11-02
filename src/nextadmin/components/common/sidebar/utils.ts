import { navForPath } from "./data";

export function isPathActive(href: string, pathname: string): boolean {
  if (!href) return false;

  if (href === "/" || href === "/admin") {
    return pathname === href;
  }

  if (/^\/admin\/p\/[^/]+$/.test(href)) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(href + "/");
}

export function findActiveGroupKey(pathname: string, nav = navForPath(pathname)): string | null {
  for (const section of nav) {
    for (const item of section.items) {
      if (item.items && item.items.length > 0) {
        const hasMatch = item.items.some((child) => child.url && isPathActive(child.url, pathname));
        if (hasMatch) return item.title;
      }
    }
  }
  return null;
}
