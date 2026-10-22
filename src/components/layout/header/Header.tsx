"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSocial } from "@/lib/social";

import "./header.scss";

const MENU = [
  {
    href: "/",
    title: "Главная",
    icon: (
      <>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9v11h5v-6h4v6h5V9" />
      </>
    ),
  },
  {
    href: "/friends",
    title: "Друзья",
    icon: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
        <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.7.8 2.7 2.6 3 5.2" />
      </>
    ),
  },
  {
    href: "/shop",
    title: "Магазин",
    icon: (
      <>
        <path d="M3 4h2.2l2.3 11.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 8H6.3" />
        <circle cx="9.5" cy="20" r="1.4" />
        <circle cx="17" cy="20" r="1.4" />
      </>
    ),
  },
  {
    href: "/profile",
    title: "Профиль",
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c.8-4.2 4-6.5 8-6.5s7.2 2.3 8 6.5" />
      </>
    ),
  },
];

const PAGES_WITHOUT_MENU = ["/register", "/room", "/game", "/auth"];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Header() {
  const pathname = usePathname();
  const social = useSocial();

  if (PAGES_WITHOUT_MENU.some((page) => pathname.startsWith(page))) {
    return null;
  }

  const requests = social.incoming.length;

  return (
    <aside className="header">
      <Link href="/" className="header-logo" aria-label="На главную">
        <Image src="/img/logo.webp" alt="Mafia Community" width={88} height={88} priority />
      </Link>

      <nav className="header-menu" aria-label="Меню">
        {MENU.map((item) => {
          const active = isActive(pathname, item.href);
          const badge = item.href === "/friends" && requests > 0 ? requests : 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? "header-link header-link-active" : "header-link"}
              aria-current={active ? "page" : undefined}
            >
              <span className="header-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {item.icon}
                </svg>
                {badge > 0 && (
                  <b className="header-badge" aria-label={`Заявок в друзья: ${badge}`}>
                    {badge}
                  </b>
                )}
              </span>
              <span className="header-title">{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="header-city" aria-hidden="true" />
    </aside>
  );
}
