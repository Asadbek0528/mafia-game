"use client";

import { useRoomPage } from "@/utils/room/room-page";

import CloseRoomDialog from "./close-room-dialog/CloseRoomDialog";
import RoomBackdrop from "./room-backdrop/RoomBackdrop";
import RoomOmen from "./room-omen/RoomOmen";
import InviteBox from "./invite-box/InviteBox";
import PlayersList from "./players-list/PlayersList";
import RoomHeader from "./room-header/RoomHeader";
import RoomSettings from "./room-settings/RoomSettings";
import "./room-page.scss";

export default function RoomPage() {
  const { room, me, isOwner, isJoining, isMeReady, isCloseOpen, isClosing, handleSettingsChange, handleReadyToggle, handleStart, handleLeave, handleCloseRoom, stay } = useRoomPage();

  if (isJoining) {
    return (
      <div className="room-page-joining" role="status">
        <span className="room-page-spinner" />
        <p className="room-page-joining-title">Игра начинается</p>
        <p className="room-page-joining-text">Подключаемся к игре…</p>
      </div>
    );
  }

  if (!room) {
    return <p className="room-page-loading">Заходим в комнату…</p>;
  }

  return (
    <div className="room-page">
      <RoomBackdrop />
      <RoomHeader room={room} onLeave={handleLeave} />

      <div className="room-page-grid">
        <PlayersList players={room.players} owner={room.owner} me={me} maxPlayers={room.max_players} />

        <RoomSettings
          room={room}
          isOwner={isOwner}
          isMeReady={isMeReady}
          onChange={handleSettingsChange}
          onReadyToggle={handleReadyToggle}
          onStart={handleStart}
        />

        <div className="room-page-side">
          <InviteBox roomId={room.id} roomName={room.name} />
          <RoomOmen />
        </div>
      </div>

      <CloseRoomDialog
        isOpen={isCloseOpen}
        roomName={room.name}
        playersCount={room.players.length}
        isClosing={isClosing}
        onClose={handleCloseRoom}
        onStay={stay}
      />
    </div>
  );
}
