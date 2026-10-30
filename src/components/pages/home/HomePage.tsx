"use client";

import Link from "next/link";

import Footer from "@/components/layout/footer/Footer";
import RoleCards from "@/components/pages/widgets/role-cards/RoleCards";
import { useHomePage } from "@/utils/home/home-page";

import CreateRoomModal from "./create-room-modal/CreateRoomModal";
import Hero from "./hero/Hero";
import HomeBlood from "./home-blood/HomeBlood";
import RoomsTable from "./rooms-table/RoomsTable";
import "./home-page.scss";

export default function HomePage() {
  const { isReady, rooms, myGame, openRooms, isModalOpen, openModal, closeModal, handleQuickPlay } = useHomePage();

  if (!isReady) {
    return null;
  }

  return (
    <div className="home-page">
      <HomeBlood />

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

        <Hero
          openRooms={openRooms}
          onPlay={handleQuickPlay}
          onCreateRoom={openModal}
        />

        <section className="panel">
          <div className="panel-top">
            <h2 className="panel-title">Роли в игре</h2>
          </div>
          <RoleCards />
        </section>

        <RoomsTable rooms={rooms} onCreateRoom={openModal} />
      </main>

      <Footer />

      <CreateRoomModal isOpen={isModalOpen} onClose={closeModal} />
    </div>
  );
}
