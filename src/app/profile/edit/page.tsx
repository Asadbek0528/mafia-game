import type { Metadata } from "next";

import ProfileEditPage from "@/components/pages/profile-edit/ProfileEditPage";

export const metadata: Metadata = { title: "Редактировать профиль — Mafia" };

export default function Page() {
  return <ProfileEditPage />;
}
