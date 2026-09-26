import type { Metadata } from "next";

import PlayerPage from "@/components/pages/player/PlayerPage";

export const metadata: Metadata = { title: "Игрок — Mafia" };

export default function Page() {
  return <PlayerPage />;
}
