import type { Metadata } from "next";

import FriendsPage from "@/components/pages/friends/FriendsPage";

export const metadata: Metadata = { title: "Друзья — Mafia" };

export default function Page() {
  return <FriendsPage />;
}
