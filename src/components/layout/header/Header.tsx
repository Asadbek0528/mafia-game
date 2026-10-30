"use client";

import Image from "next/image";
import Link from "next/link";

import { type MenuIcon, useHeader } from "@/utils/widgets/header";

import "./header.scss";

const ICONS: Record<MenuIcon, React.ReactNode> = {
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9v11h5v-6h4v6h5V9" />
    </>
  ),
  friends: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.7.8 2.7 2.6 3 5.2" />
    </>
  ),
  shop: (
    <>
      <path d="M3 4h2.2l2.3 11.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 8H6.3" />
      <circle cx="9.5" cy="20" r="1.4" />
      <circle cx="17" cy="20" r="1.4" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c.8-4.2 4-6.5 8-6.5s7.2 2.3 8 6.5" />
    </>
  ),
};

export default function Header() {
  const { isHidden, links } = useHeader();

  if (isHidden) {
    return null;
  }

  return (
    <aside className="header">
      <Link href="/" className="header-logo" aria-label="На главную">
        <Image src="/img/logo.webp" alt="Mafia Community" width={88} height={88} priority />
      </Link>

      <nav className="header-menu" aria-label="Меню">
        {links.map((item) => (
          <Link key={item.href} href={item.href} className={item.className} aria-current={item.active ? "page" : undefined}>
            <span className="header-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {ICONS[item.icon]}
              </svg>
              {item.badge > 0 && (
                <b className="header-badge" aria-label={`Заявок в друзья: ${item.badge}`}>
                  {item.badge}
                </b>
              )}
            </span>
            <span className="header-title">{item.title}</span>
          </Link>
        ))}
      </nav>

      <div className="header-city" aria-hidden="true" />
    </aside>
  );
}
