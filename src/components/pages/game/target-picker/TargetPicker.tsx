import Avatar from "@/components/pages/widgets/avatar/Avatar";
import type { GamePlayer } from "@/lib/api";
import { getRole } from "@/lib/roles";
import "./target-picker.scss";

type TargetPickerProps = {
  title?: string;
  subtitle?: string;
  players: GamePlayer[];
  selectableIds: number[];
  selectedId: number | null;
  meId: number | null;
  isSent: boolean;
  isUrgent?: boolean;
  confirmText?: string;
  headerButton?: React.ReactNode;
  showRole: (player: GamePlayer) => boolean;
  deathLabel: (player: GamePlayer) => string;
  onSelect: (playerId: number) => void;
  onConfirm?: () => void;
  voteCounts?: Record<number, number>;
  votedIds?: number[];
  voteLines?: { voter: string; target: string }[];
};

export default function TargetPicker(props: TargetPickerProps) {
  const { title, subtitle, players, selectableIds, selectedId, meId, isSent, isUrgent, confirmText, headerButton, showRole, deathLabel, onSelect, onConfirm, voteCounts, votedIds, voteLines } = props;

  const canChoose = selectableIds.length > 0 && !isSent;
  const aliveCount = players.filter((player) => player.isAlive).length;

  return (
    <section className="target-picker">
      <div className="target-picker-top">
        <h2 className="target-picker-heading">
          Игроки
          <span title="Живых из всех">
            {aliveCount}/{players.length}
          </span>
        </h2>
        {headerButton}
      </div>

      {(title || subtitle) && (
        <div className={isUrgent ? "target-picker-task target-picker-task-urgent" : "target-picker-task"} role="status">
          {title && <p className="target-picker-title">{title}</p>}
          {subtitle && <p className="target-picker-subtitle">{subtitle}</p>}
        </div>
      )}

      <ul className="target-picker-list">
        {players.map((player) => {
          const isSelectable = canChoose && selectableIds.includes(player.id);
          const isSelected = player.id === selectedId;
          const hasVoted = votedIds?.includes(player.id) ?? false;
          const votes = voteCounts?.[player.id] ?? 0;

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
                <Avatar name={player.username} size={56} />
                <span className="target-picker-name">
                  {player.isAlive ? <i className="target-picker-dot" aria-hidden="true" /> : <SkullIcon />}
                  <span>{player.username}</span>
                </span>

                {player.id === meId && <span className="target-picker-me">Вы</span>}
                {showRole(player) && player.role && (
                  <span className={player.role === "mafia" ? "target-picker-chip target-picker-chip-mafia" : "target-picker-chip target-picker-chip-town"}>
                    {getRole(player.role).name}
                  </span>
                )}
                {!player.isAlive && <span className="target-picker-chip target-picker-chip-dead">{deathLabel(player)}</span>}
                {votedIds && player.isAlive && (
                  <span
                    className={hasVoted ? "target-picker-voted target-picker-voted-yes" : "target-picker-voted"}
                    title={hasVoted ? "Уже проголосовал" : "Ещё не проголосовал"}
                  >
                    {hasVoted ? "✓" : "✗"}
                  </span>
                )}
                {votes > 0 && (
                  <span className="target-picker-votes" title="Голосов против этого игрока">
                    <VoteIcon /> {votes} {voteWord(votes)}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {voteLines && voteLines.length > 0 && (
        <div className="target-picker-who">
          <p className="target-picker-who-title">Кто за кого</p>
          <ul>
            {voteLines.map((line) => (
              <li key={`${line.voter}-${line.target}`}>
                <b>{line.voter}</b>
                <span aria-label="голосует против">→</span>
                <b>{line.target}</b>
              </li>
            ))}
          </ul>
        </div>
      )}

      {confirmText && onConfirm && (
        <button className="btn btn-red target-picker-confirm" disabled={selectedId === null || isSent} onClick={onConfirm}>
          {isSent ? "Выбор отправлен ✓" : confirmText}
        </button>
      )}
    </section>
  );
}

function SkullIcon() {
  return (
    <svg className="target-picker-skull" viewBox="0 0 24 24" fill="currentColor" aria-label="Выбыл">
      <path d="M12 2C7 2 3.5 5.600 3.500 10.200c0 2.600 1.100 4.600 2.800 6V19c0 .8.700 1.500 1.500 1.500H9V22h2v-1.500h2V22h2v-1.500h1.200c.8 0 1.500-.7 1.500-1.500v-2.800c1.700-1.400 2.800-3.400 2.800-6C20.500 5.600 17 2 12 2zM8.500 13.500a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm7 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
    </svg>
  );
}

export function VoteIcon() {
  return (
    <svg className="vote-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <path d="M12 1v5M12 18v5M1 12h5M18 12h5" strokeLinecap="round" />
    </svg>
  );
}

function voteWord(count: number): string {
  const last = count % 10;
  const lastTwo = count % 100;
  if (last === 1 && lastTwo !== 11) return "голос";
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return "голоса";
  return "голосов";
}
