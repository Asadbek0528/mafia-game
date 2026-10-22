"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import ProfileEditForm from "@/components/pages/profile/profile-edit-form/ProfileEditForm";
import { useCurrentUser } from "@/lib/auth";
import BackgroundPicker from "./background-picker/BackgroundPicker";
import "./profile-edit-page.scss";

// Откуда пришли на редактирование — туда и возвращаемся
const BACK_TARGETS = {
  home: { href: "/", text: "На главную" },
  profile: { href: "/profile", text: "Назад в профиль" },
};

export default function ProfileEditPage() {
  const router = useRouter();
  const { user, isLoaded } = useCurrentUser();
  const [back, setBack] = useState(BACK_TARGETS.profile);

  useEffect(() => {
    const from = new URLSearchParams(window.location.search).get("from");
    if (from === "home") setBack(BACK_TARGETS.home);
  }, []);

  useEffect(() => {
    if (isLoaded && (!user || user.guest)) router.replace(user ? "/profile" : "/register");
  }, [isLoaded, user, router]);

  // Пришли по ссылке «Сменить фон» — сразу показываем раздел «Оформление»
  const isReady = Boolean(user && !user.guest);
  useEffect(() => {
    if (!isReady || window.location.hash !== "#appearance") return;
    requestAnimationFrame(() => document.getElementById("appearance")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [isReady]);

  if (!user || user.guest) return null;

  return (
    <main className="profile-edit-page">
      <Link href={back.href} className="profile-edit-page-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" />
        </svg>
        {back.text}
      </Link>

      <ProfileEditForm onSaved={() => router.push(back.href)} />

      <BackgroundPicker user={user} />
    </main>
  );
}
