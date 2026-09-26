/*
  Адрес "/game/12" — сама игра.
  "/game/demo-83491" — демо-игра с ботами (без сервера).
*/
import type { Metadata } from "next";

import GamePage from "@/components/pages/game/GamePage";

export const metadata: Metadata = { title: "Игра — Mafia" };

export default function Page() {
  return <GamePage />;
}
