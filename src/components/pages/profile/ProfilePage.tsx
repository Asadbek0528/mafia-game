"use client";

import AchievementsPanel from "@/components/pages/widgets/achievements/AchievementsPanel";
import GameHistory from "@/components/pages/widgets/game-history/GameHistory";
import ProfileCard from "@/components/pages/widgets/profile-card/ProfileCard";
import { useProfilePage } from "@/utils/profile/profile";

import FriendsPanel from "./friends-panel/FriendsPanel";
import ProfileBlood from "./profile-blood/ProfileBlood";
import ProfileStats from "./profile-stats/ProfileStats";
import "./profile-page.scss";

export default function ProfilePage() {
  const { user, isMember, achievementsUserId } = useProfilePage();

  if (!user) return null;

  return (
    <main className="profile-page">
      <ProfileBlood />
      <h1 className="profile-page-title">Профиль</h1>

      <div className="profile-page-grid">
        <div className="profile-page-side">
          <ProfileCard showStats={false} />
          {isMember && <FriendsPanel />}
        </div>

        <div className="profile-page-main">
          <ProfileStats />
          {achievementsUserId && <AchievementsPanel userId={achievementsUserId} />}
          <GameHistory limit={20} />
        </div>
      </div>
    </main>
  );
}
