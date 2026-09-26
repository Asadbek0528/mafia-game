import type { Metadata } from "next";

import ProfilePage from "@/components/pages/profile/ProfilePage";

export const metadata: Metadata = { title: "Профиль — Mafia" };

export default function Page() {
  return <ProfilePage />;
}
