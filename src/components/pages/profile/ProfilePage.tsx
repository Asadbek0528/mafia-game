"use client";

/*
  ProfilePage — страница профиля, адрес "/profile".
  Пока показывает карточку игрока и историю игр.
*/
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import GameHistory from "@/components/pages/widgets/game-history/GameHistory";
import ProfileCard from "@/components/pages/widgets/profile-card/ProfileCard";
import { useCurrentUser } from "@/lib/auth";
import "./profile-page.scss";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoaded } = useCurrentUser();

  useEffect(() => {
    if (isLoaded && !user) router.replace("/register");
  }, [isLoaded, user, router]);

  if (!user) return null;

  return (
    <main className="profile-page">
      <h1 className="profile-page-title">Профиль</h1>

      <div className="profile-page-grid">
        <ProfileCard />
        <GameHistory limit={20} />
      </div>
    </main>
  );
}
