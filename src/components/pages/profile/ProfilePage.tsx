"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import AchievementsPanel from "@/components/pages/widgets/achievements/AchievementsPanel";
import GameHistory from "@/components/pages/widgets/game-history/GameHistory";
import ProfileCard from "@/components/pages/widgets/profile-card/ProfileCard";
import { useCurrentUser } from "@/lib/auth";

import FriendsPanel from "./friends-panel/FriendsPanel";
import ProfileBlood from "./profile-blood/ProfileBlood";
import ProfileStats from "./profile-stats/ProfileStats";
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
      <ProfileBlood />
      <h1 className="profile-page-title">Профиль</h1>

      <div className="profile-page-grid">
        <div className="profile-page-side">
          <ProfileCard showStats={false} />
          {!user.guest && <FriendsPanel />}
        </div>

        <div className="profile-page-main">
          <ProfileStats />
          {!user.guest && user.id && <AchievementsPanel userId={user.id} />}
          <GameHistory limit={20} />
        </div>
      </div>
    </main>
  );
}
