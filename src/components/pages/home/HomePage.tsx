"use client";

/*
  HomePage — главное меню (шаг 2), адрес "/".

  Раскладка:
  ┌─────────────────────────────┬──────────────┐
  │ Hero (большой баннер)        │ ProfileCard  │
  │ RoleCards (4 карточки ролей) │ OnlinePlayers│
  │ RoomsTable (комнаты)         │ GameHistory  │
  └─────────────────────────────┴──────────────┘
  Слева от всего — Header (он в app/layout.tsx).
*/
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Footer from "@/components/layout/footer/Footer";
import GameHistory from "@/components/pages/widgets/game-history/GameHistory";
import ProfileCard from "@/components/pages/widgets/profile-card/ProfileCard";
import RoleCards from "@/components/pages/widgets/role-cards/RoleCards";
import { api, loadOrDemo, type RoomShort } from "@/lib/api";
import { useCurrentUser } from "@/lib/auth";
import { DEMO_ROOMS } from "@/lib/demo";

import CreateRoomModal from "./create-room-modal/CreateRoomModal";
import Hero from "./hero/Hero";
import OnlinePlayers from "./online-players/OnlinePlayers";
import RoomsTable from "./rooms-table/RoomsTable";
import "./home-page.scss";

export default function HomePage() {
  const router = useRouter();
  const { user, isLoaded } = useCurrentUser();

  const [rooms, setRooms] = useState<RoomShort[] | null>(null); // null = ещё грузится
  const [isModalOpen, setIsModalOpen] = useState(false);

  // нет аккаунта и не гость → на регистрацию
  useEffect(() => {
    if (isLoaded && !user) {
      router.replace("/register");
    }
  }, [isLoaded, user, router]);

  // загружаем комнаты
  useEffect(() => {
    loadOrDemo(api.getRooms, DEMO_ROOMS).then(setRooms);
  }, []);

  // «Начать игру»: заходим в первую свободную комнату, если её нет — создаём
  function handleQuickPlay() {
    const freeRoom = rooms?.find((room) => room.status === "waiting" && room.players < room.max_players);

    if (freeRoom) {
      router.push(`/room/${freeRoom.id}`);
    } else {
      setIsModalOpen(true);
    }
  }

  // пока не знаем, кто пользователь — ничего не показываем
  if (!isLoaded || !user) {
    return null;
  }

  return (
    <div className="home-page">
      {/* ---- центр ---- */}
      <main className="home-page-main">
        <Hero onPlay={handleQuickPlay} onCreateRoom={() => setIsModalOpen(true)} />

        <section className="panel">
          <div className="panel-top">
            <h2 className="panel-title">Роли в игре</h2>
          </div>
          <RoleCards />
        </section>

        <RoomsTable rooms={rooms} onCreateRoom={() => setIsModalOpen(true)} />

        <Footer />
      </main>

      {/* ---- правая колонка ---- */}
      <aside className="home-page-side">
        <ProfileCard />
        <OnlinePlayers />
        <GameHistory />
      </aside>

      <CreateRoomModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
