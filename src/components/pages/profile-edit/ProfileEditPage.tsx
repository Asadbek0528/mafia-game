"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import ProfileEditForm from "@/components/pages/profile/profile-edit-form/ProfileEditForm";
import { useCurrentUser } from "@/lib/auth";
import "./profile-edit-page.scss";

export default function ProfileEditPage() {
  const router = useRouter();
  const { user, isLoaded } = useCurrentUser();

  useEffect(() => {
    if (isLoaded && (!user || user.guest)) router.replace(user ? "/profile" : "/register");
  }, [isLoaded, user, router]);

  if (!user || user.guest) return null;

  return (
    <main className="profile-edit-page">
      <Link href="/profile" className="profile-edit-page-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" />
        </svg>
        Назад в профиль
      </Link>

      <ProfileEditForm onSaved={() => router.push("/profile")} />
    </main>
  );
}
