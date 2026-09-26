"use client";

/*
  Header — боковое меню (sidebar).
  На ноутбуке и планшете: слева.
  На телефоне: превращается в нижнее меню (как в приложении).
  На страницах /register, /room и /game меню не показываем.
*/
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import "./header.scss";

// Пункты меню. icon — это SVG-иконка
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

// страницы, где меню не нужно
const PAGES_WITHOUT_MENU = ["/register", "/room", "/game", "/auth"];

export default function Header() {
  const pathname = usePathname();

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
            </Link>
          );
        })}
      </nav>

      {/* картинка города внизу меню */}
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
