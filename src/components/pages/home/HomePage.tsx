"use client";

import Link from "next/link";
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

  const [rooms, setRooms] = useState<RoomShort[] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [myGame, setMyGame] = useState<{ gameId: string; roomName: string } | null>(null);

  useEffect(() => {
    if (isLoaded && !user) {
      router.replace("/register");
    }
  }, [isLoaded, user, router]);

  useEffect(() => {
    loadOrDemo(api.getRooms, DEMO_ROOMS).then(setRooms);
  }, []);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let isStopped = false;
    const check = () =>
      api
        .findMyActiveGame()
        .then((game) => {
          if (!isStopped) setMyGame(game);
        })
        .catch(() => {});
    check();
    const timer = setInterval(check, 15000);
    return () => {
      isStopped = true;
      clearInterval(timer);
    };
  }, [userId]);

  function handleQuickPlay() {
    const freeRoom = rooms?.find((room) => room.status === "waiting" && room.players < room.max_players);

    if (freeRoom) {
      router.push(`/room/${freeRoom.id}`);
    } else {
      setIsModalOpen(true);
    }
  }

  if (!isLoaded || !user) {
    return null;
  }

  return (
    <div className="home-page">
      <main className="home-page-main">
        {myGame && (
          <div className="home-page-rejoin" role="status">
            <p>
              <b>Вы в игре{myGame.roomName ? ` «${myGame.roomName}»` : ""}</b>
              Игра ещё идёт — можно вернуться.
            </p>
            <Link href={`/game/${myGame.gameId}`} className="btn btn-red">
              Вернуться в игру
            </Link>
          </div>
        )}

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

      <aside className="home-page-side">
        <ProfileCard />
        <OnlinePlayers />
        <GameHistory />
      </aside>

      <CreateRoomModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
