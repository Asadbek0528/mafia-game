import type { Metadata } from "next";

import RoomPage from "@/components/pages/room/RoomPage";

export const metadata: Metadata = { title: "Комната — Mafia" };

export default function Page() {
  return <RoomPage />;
}
