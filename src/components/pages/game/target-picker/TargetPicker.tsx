import Avatar from "@/components/pages/widgets/avatar/Avatar";
import type { GamePlayer } from "@/lib/api";
import { getRole } from "@/lib/roles";
import "./target-picker.scss";

type TargetPickerProps = {
  title: string;
  subtitle?: string;
  players: GamePlayer[];
  selectableIds: number[];
  selectedId: number | null;
  meId: number | null;
  isSent: boolean;
  confirmText?: string;
  showRole: (player: GamePlayer) => boolean;
  onSelect: (playerId: number) => void;
  onConfirm?: () => void;
  voteCounts?: Record<number, number>;
  votedIds?: number[];
};

export default function TargetPicker(props: TargetPickerProps) {
  const { title, subtitle, players, selectableIds, selectedId, meId, isSent, confirmText, showRole, onSelect, onConfirm, voteCounts, votedIds } = props;

  const canChoose = selectableIds.length > 0 && !isSent;

  return (
    <section className="target-picker">
      <h2 className="target-picker-title">{title}</h2>
      {subtitle && <p className="target-picker-subtitle">{subtitle}</p>}

      <ul className="target-picker-list">
        {players.map((player) => {
          const isSelectable = canChoose && selectableIds.includes(player.id);
          const isSelected = player.id === selectedId;

          let className = "target-picker-player";
          if (!player.isAlive) className += " target-picker-player-dead";
          if (isSelectable) className += " target-picker-player-selectable";
          if (isSelected) className += " target-picker-player-selected";

          return (
            <li key={player.id} className="target-picker-item">
              <button
                type="button"
                className={className}
                disabled={!isSelectable}
                onClick={() => onSelect(player.id)}
                aria-pressed={isSelected}
              >
                <Avatar name={player.username} size={52} />
                <span className="target-picker-name">
                  {player.username}
                  {player.id === meId && " (вы)"}
                </span>

                {showRole(player) && player.role && <span className="target-picker-role">{getRole(player.role).name}</span>}
                {votedIds && player.isAlive && (
                  <span
                    className={votedIds.includes(player.id) ? "target-picker-voted target-picker-voted-yes" : "target-picker-voted"}
                    title={votedIds.includes(player.id) ? "Уже проголосовал" : "Ещё не проголосовал"}
                  >
                    {votedIds.includes(player.id) ? "✓" : "✗"}
                  </span>
                )}
                {voteCounts && (voteCounts[player.id] ?? 0) > 0 && (
                  <span className="target-picker-votes" title="Голосов против этого игрока">
                    🗳 {voteCounts[player.id]} {voteWord(voteCounts[player.id])}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {confirmText && onConfirm && (
        <button className="btn btn-red target-picker-confirm" disabled={selectedId === null || isSent} onClick={onConfirm}>
          {isSent ? "Выбор отправлен ✓" : confirmText}
        </button>
      )}
    </section>
  );
}

function voteWord(count: number): string {
  const last = count % 10;
  const lastTwo = count % 100;
  if (last === 1 && lastTwo !== 11) return "голос";
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return "голоса";
  return "голосов";
}
