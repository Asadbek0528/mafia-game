import type { CSSProperties } from "react";

import type { GamePlayer } from "@/utils/api";
import { voteWord } from "@/utils/format";
import { getRole } from "@/utils/roles";
import { type BackgroundId, useShop } from "@/utils/shop";
import { useSkins } from "@/utils/skins";

import { arrowPath, seatPosition } from "./game-logic";
import type { PlayerMark, TargetPickerData } from "./types";

export type TargetPickerSeat = {
  player: GamePlayer;
  style: CSSProperties;
  className: string;
  isSelectable: boolean;
  isSelected: boolean;
  isMe: boolean;
  background: BackgroundId | null;
  mark: PlayerMark | undefined;
  roleChip: { name: string; className: string } | null;
  deathLabel: string | null;
  voted: { className: string; title: string; symbol: string } | null;
  votesText: string | null;
};

function votedBadge(hasSkipped: boolean, hasVoted: boolean) {
  if (hasSkipped) return { className: "target-picker-voted target-picker-voted-skip", title: "Пропустил голосование", symbol: "–" };
  if (hasVoted) return { className: "target-picker-voted target-picker-voted-yes", title: "Уже проголосовал", symbol: "✓" };
  return { className: "target-picker-voted", title: "Ещё не проголосовал", symbol: "✗" };
}

export function useTargetPicker(props: TargetPickerData) {
  const { players, selectableIds, selectedId, meId, isSent, showRole, deathLabel, voteCounts, votedIds, skippedIds, marks, voteArrows } = props;

  const myBackground = useShop().state.equipped;
  const skins = useSkins();
  const canChoose = selectableIds.length > 0 && !isSent;
  const aliveCount = players.filter((player) => player.isAlive).length;
  const seats = new Map(players.map((player, index) => [player.id, seatPosition(index, players.length)]));
  const selectedSeat = selectedId !== null ? (seats.get(selectedId) ?? null) : null;
  const arrows = (voteArrows ?? [])
    .filter((arrow) => seats.has(arrow.from) && seats.has(arrow.to))
    .map((arrow) => ({ key: `${arrow.from}-${arrow.to}`, d: arrowPath(seats.get(arrow.from)!, seats.get(arrow.to)!) }));
  const selectable = new Set(selectableIds);
  const voted = new Set(votedIds ?? []);
  const skipped = new Set(skippedIds ?? []);

  const items: TargetPickerSeat[] = players.map((player) => {
    const seat = seats.get(player.id);
    const isSelectable = canChoose && selectable.has(player.id);
    const isSelected = player.id === selectedId;
    const isRoleShown = showRole(player) && Boolean(player.role);
    const votes = voteCounts?.[player.id] ?? 0;

    let className = "target-picker-player";
    if (!player.isAlive) className += " target-picker-player-dead";
    if (isSelectable) className += " target-picker-player-selectable";
    if (isSelected) className += " target-picker-player-selected";

    return {
      player,
      style: { "--seat-x": `${seat?.x ?? 50}%`, "--seat-y": `${seat?.y ?? 50}%` } as CSSProperties,
      className,
      isSelectable,
      isSelected,
      isMe: player.id === meId,
      background: player.id === meId ? myBackground : (skins.get(player.username) ?? null),
      mark: !isRoleShown ? marks?.[player.id] : undefined,
      roleChip:
        isRoleShown && player.role
          ? {
              name: getRole(player.role).name,
              className: player.role === "mafia" ? "target-picker-chip target-picker-chip-mafia" : "target-picker-chip target-picker-chip-town",
            }
          : null,
      deathLabel: player.isAlive ? null : deathLabel(player),
      voted: votedIds && player.isAlive ? votedBadge(skipped.has(player.id), voted.has(player.id)) : null,
      votesText: votes > 0 ? `${votes} ${voteWord(votes)}` : null,
    };
  });

  return {
    aliveCount,
    arrows,
    selectedSeat,
    items,
    isCrowded: players.length > 10,
  };
}
