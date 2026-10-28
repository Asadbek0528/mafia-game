import { usePathname } from "next/navigation";

import { useSocial } from "@/utils/social";

const PAGES_WITHOUT_MENU = ["/register", "/room", "/game", "/auth"];

export const MENU_LINKS = [
  { href: "/", title: "Главная", icon: "home" },
  { href: "/friends", title: "Друзья", icon: "friends" },
  { href: "/shop", title: "Магазин", icon: "shop" },
  { href: "/profile", title: "Профиль", icon: "profile" },
] as const;

export type MenuIcon = (typeof MENU_LINKS)[number]["icon"];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function useHeader() {
  const pathname = usePathname();
  const social = useSocial();
  const requests = social.incoming.length;

  return {
    isHidden: PAGES_WITHOUT_MENU.some((page) => pathname.startsWith(page)),
    links: MENU_LINKS.map((item) => {
      const active = isActive(pathname, item.href);
      return {
        ...item,
        active,
        className: active ? "header-link header-link-active" : "header-link",
        badge: item.href === "/friends" ? requests : 0,
      };
    }),
  };
}
