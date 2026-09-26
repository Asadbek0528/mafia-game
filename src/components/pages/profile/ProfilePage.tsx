"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import GameHistory from "@/components/pages/widgets/game-history/GameHistory";
import ProfileCard from "@/components/pages/widgets/profile-card/ProfileCard";
import { useCurrentUser } from "@/lib/auth";

import ProfileEditForm from "./profile-edit-form/ProfileEditForm";
import "./profile-page.scss";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoaded } = useCurrentUser();

  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (isLoaded && !user) router.replace("/register");
  }, [isLoaded, user, router]);

  if (!user) return null;

  return (
    <main className="profile-page">
      <h1 className="profile-page-title">Профиль</h1>

      <div className="profile-page-grid">
        <ProfileCard key={version} />

        <div className="profile-page-main">
          <ProfileEditForm onSaved={() => setVersion(version + 1)} />
          <GameHistory limit={20} />
        </div>
      </div>
    </main>
  );
}
