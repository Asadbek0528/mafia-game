import type { Metadata } from "next";

import GamePage from "@/components/pages/game/GamePage";

export const metadata: Metadata = { title: "Игра — Mafia" };

export default function Page() {
  return <GamePage />;
}
