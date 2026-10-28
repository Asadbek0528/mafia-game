"use client";

import Link from "next/link";

import ProfileEditForm from "@/components/pages/profile/profile-edit-form/ProfileEditForm";
import { useProfileEditPage } from "@/utils/profile/profile";

import BackgroundPicker from "./background-picker/BackgroundPicker";
import "./profile-edit-page.scss";

export default function ProfileEditPage() {
  const { user, back, onSaved } = useProfileEditPage();

  if (!user) return null;

  return (
    <main className="profile-edit-page">
      <Link href={back.href} className="profile-edit-page-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" />
        </svg>
        {back.text}
      </Link>

      <ProfileEditForm onSaved={onSaved} />

      <BackgroundPicker user={user} />
    </main>
  );
}
