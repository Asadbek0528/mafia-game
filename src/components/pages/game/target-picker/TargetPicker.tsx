import Avatar from "@/components/pages/widgets/avatar/Avatar";
import type { GamePlayer } from "@/lib/api";
import { getRole } from "@/lib/roles";
import "./target-picker.scss";

export type Suspicion = {
  counts: Record<number, number>;
  mine: number | null;
  canSuspect: boolean;
  topId: number | null;
  onSuspect: (playerId: number) => void;
};

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
  suspicion?: Suspicion;
  voteCounts?: Record<number, number>;
};

export default function TargetPicker(props: TargetPickerProps) {
  const { title, subtitle, players, selectableIds, selectedId, meId, isSent, confirmText, showRole, onSelect, onConfirm, suspicion, voteCounts } = props;

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
          if (suspicion && suspicion.topId === player.id) className += " target-picker-player-suspected";

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
                {voteCounts && (voteCounts[player.id] ?? 0) > 0 && (
                  <span className="target-picker-votes" title="Голосов против">
                    {voteCounts[player.id]} {voteWord(voteCounts[player.id])}
                  </span>
                )}
              </button>
              {suspicion && player.isAlive && (
                <SuspectEye
                  count={suspicion.counts[player.id] ?? 0}
                  isMine={suspicion.mine === player.id}
                  isTop={suspicion.topId === player.id}
                  canClick={suspicion.canSuspect && player.id !== meId}
                  onClick={() => suspicion.onSuspect(player.id)}
                />
              )}
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

type SuspectEyeProps = {
  count: number;
  isMine: boolean;
  isTop: boolean;
  canClick: boolean;
  onClick: () => void;
};

function SuspectEye({ count, isMine, isTop, canClick, onClick }: SuspectEyeProps) {
  if (!canClick && count === 0) return null;

  let className = "target-picker-eye";
  if (isMine) className += " target-picker-eye-mine";
  if (isTop) className += " target-picker-eye-top";

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={!canClick}
      aria-pressed={isMine}
      title={isMine ? "Убрать подозрение" : "Подозреваю"}
      aria-label={isMine ? "Убрать подозрение" : "Подозреваю этого игрока"}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" fill={isMine ? "currentColor" : "none"} />
      </svg>
      {count > 0 && <span>{count}</span>}
    </button>
  );
}
