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
    icon: <path d="M12 3 2 11h3v9h5v-6h4v6h5v-9h3z" />,
  },
  {
    href: "/#rooms",
    title: "Играть",
    icon: <path d="M7 4v16l13-8z" />,
  },
  {
    href: "/roles",
    title: "Роли",
    icon: <path d="M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm6 5-3 5 3 5 3-5z" />,
  },
  {
    href: "/friends",
    title: "Друзья",
    icon: (
      <>
        <circle cx="9" cy="8" r="3.6" />
        <path d="M2 20c0-3.6 3.1-6 7-6s7 2.4 7 6z" />
        <circle cx="17" cy="9" r="2.8" />
        <path d="M16.5 13.2c3 .3 5.5 2.4 5.5 5.3V20h-4.5c0-2.6-.4-4.9-1-6.8z" />
      </>
    ),
  },
  {
    href: "/profile",
    title: "Профиль",
    icon: (
      <>
        <circle cx="12" cy="8" r="4.5" />
        <path d="M3 21c0-4.5 4-7 9-7s9 2.5 9 7z" />
      </>
    ),
  },
];

const PAGES_WITHOUT_MENU = ["/register", "/room", "/game", "/auth"];

export default function Header() {
  const pathname = usePathname();
  const social = useSocial();

  const hideMenu = PAGES_WITHOUT_MENU.some((page) => pathname.startsWith(page));
  if (hideMenu) {
    return null;
  }

  return (
    <aside className="header">
      <Link href="/" className="header-logo" aria-label="На главную">
        <Image src="/img/logo.webp" alt="Mafia Community" width={120} height={120} priority />
      </Link>

      <nav className="header-menu" aria-label="Меню">
        {MENU.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={isActive ? "header-link header-link-active" : "header-link"}
              aria-current={isActive ? "page" : undefined}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                {item.icon}
              </svg>
              <span>{item.title}</span>
              {item.href === "/friends" && social.incoming.length > 0 && (
                <b className="header-badge">{social.incoming.length}</b>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="header-city" aria-hidden="true">
        <p className="header-city-text">
          Следи за тенью.
          <br />
          Она может быть мафией.
        </p>
      </div>
    </aside>
  );
}
