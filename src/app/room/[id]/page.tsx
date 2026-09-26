/*
  Адрес "/room/83491" — комната (лобби).
  [id] в названии папки = номер комнаты из адреса.
  RoomPage сам достаёт id через useParams().
*/
import type { Metadata } from "next";

import RoomPage from "@/components/pages/room/RoomPage";

export const metadata: Metadata = { title: "Комната — Mafia" };

export default function Page() {
  return <RoomPage />;
}
