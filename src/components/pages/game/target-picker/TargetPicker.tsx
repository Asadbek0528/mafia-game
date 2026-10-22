import Avatar from "@/components/pages/widgets/avatar/Avatar";
import PlayerBackground from "@/components/pages/widgets/player-background/PlayerBackground";
import type { GamePlayer } from "@/lib/api";
import { getRole } from "@/lib/roles";
import { useShop } from "@/lib/shop";
import { useSkins } from "@/lib/skins";
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
  skippedIds?: number[];
  voteLines?: { voter: string; target: string | null }[];
  marks?: Record<number, { text: string; tone: "mafia" | "town" }>;
  sentText?: string;
  onSkip?: () => void;
  // Кто за кого голосует — стрелками между местами за столом
  voteArrows?: { from: number; to: number }[];
};

// Место за овальным столом: начинаем сверху и идём по часовой стрелке (в процентах сцены)
function seatPosition(index: number, total: number) {
  const angle = -Math.PI / 2 + (index / Math.max(1, total)) * Math.PI * 2;
  return { x: 50 + Math.cos(angle) * 41, y: 50 + Math.sin(angle) * 38 };
}

// Стрелка голоса чуть изогнута к центру стола и не заходит на карточки
function arrowPath(from: { x: number; y: number }, to: { x: number; y: number }) {
  const shorten = (a: { x: number; y: number }, b: { x: number; y: number }, by: number) => {
    const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: a.x + ((b.x - a.x) / length) * by, y: a.y + ((b.y - a.y) / length) * by };
  };
  const start = shorten(from, to, 7);
  const end = shorten(to, from, 8);
  const control = { x: (start.x + end.x) / 2 + (50 - (start.x + end.x) / 2) * 0.35, y: (start.y + end.y) / 2 + (50 - (start.y + end.y) / 2) * 0.35 };
  return `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
}

export default function TargetPicker(props: TargetPickerProps) {
  const { title, subtitle, players, selectableIds, selectedId, meId, isSent, isUrgent, confirmText, headerButton, showRole, deathLabel, onSelect, onConfirm, voteCounts, votedIds, skippedIds, voteLines, marks, sentText, onSkip, voteArrows } = props;

  const canChoose = selectableIds.length > 0 && !isSent;
  const myBackground = useShop().state.equipped;
  const skins = useSkins();
  const aliveCount = players.filter((player) => player.isAlive).length;
  const seats = new Map(players.map((player, index) => [player.id, seatPosition(index, players.length)]));
  const selectedSeat = selectedId !== null ? seats.get(selectedId) : undefined;
  const arrows = (voteArrows ?? []).filter((arrow) => seats.has(arrow.from) && seats.has(arrow.to));
  const isCrowded = players.length > 10;

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

      {/* Стол: на широком экране игроки сидят по кругу, на узком — обычная сетка */}
      <div className={isCrowded ? "target-picker-stage target-picker-stage-crowded" : "target-picker-stage"}>
        <div className="target-picker-table" aria-hidden="true">
          <div className="target-picker-table-center">
            {title ? <p className="target-picker-table-title">{title}</p> : <p className="target-picker-table-title target-picker-table-title-quiet">Живых {aliveCount} из {players.length}</p>}
            {subtitle && <p className="target-picker-table-text">{subtitle}</p>}
          </div>
        </div>

        <svg className="target-picker-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <marker id="target-picker-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0 0 10 5 0 10Z" fill="#ff3b45" />
            </marker>
          </defs>
          {arrows.map((arrow) => (
            <path
              key={`${arrow.from}-${arrow.to}`}
              className="target-picker-arrow"
              d={arrowPath(seats.get(arrow.from)!, seats.get(arrow.to)!)}
              markerEnd="url(#target-picker-arrow)"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {selectedSeat && arrows.length === 0 && (
            <line className="target-picker-pointer" x1="50" y1="50" x2={selectedSeat.x} y2={selectedSeat.y} vectorEffect="non-scaling-stroke" />
          )}
        </svg>

        <ul className="target-picker-list">
          {players.map((player) => {
            const isSelectable = canChoose && selectableIds.includes(player.id);
            const isSelected = player.id === selectedId;
            const hasVoted = votedIds?.includes(player.id) ?? false;
            const votes = voteCounts?.[player.id] ?? 0;
            const hasSkipped = skippedIds?.includes(player.id) ?? false;
            const isRoleShown = showRole(player) && Boolean(player.role);
            const mark = !isRoleShown ? marks?.[player.id] : undefined;

            let className = "target-picker-player";
            if (!player.isAlive) className += " target-picker-player-dead";
            if (isSelectable) className += " target-picker-player-selectable";
            if (isSelected) className += " target-picker-player-selected";

            return (
              <li
                key={player.id}
                className="target-picker-item"
                style={{ "--seat-x": `${seats.get(player.id)?.x ?? 50}%`, "--seat-y": `${seats.get(player.id)?.y ?? 50}%` } as React.CSSProperties}
              >
                <button
                  type="button"
                  className={className}
                  disabled={!isSelectable}
                  onClick={() => onSelect(player.id)}
                  aria-pressed={isSelected}
                >
                  <PlayerBackground id={player.id === meId ? myBackground : (skins.get(player.username) ?? null)} />
                  <Avatar name={player.username} size={56} />
                  <span className="target-picker-name">
                    {player.isAlive ? <i className="target-picker-dot" aria-hidden="true" /> : <SkullIcon />}
                    <span>{player.username}</span>
                  </span>

                  {player.id === meId && <span className="target-picker-me">Вы</span>}
                  {mark && (
                    <span className={mark.tone === "mafia" ? "target-picker-chip target-picker-chip-mafia" : "target-picker-chip target-picker-chip-checked"} title="Ваша проверка">
                      {mark.tone === "mafia" ? "🔍 Мафия" : "🔍 Мирный"}
                    </span>
                  )}
                  {isRoleShown && player.role && (
                    <span className={player.role === "mafia" ? "target-picker-chip target-picker-chip-mafia" : "target-picker-chip target-picker-chip-town"}>
                      {getRole(player.role).name}
                    </span>
                  )}
                  {!player.isAlive && <span className="target-picker-chip target-picker-chip-dead">{deathLabel(player)}</span>}
                  {votedIds && player.isAlive && (
                    <span
                      className={hasSkipped ? "target-picker-voted target-picker-voted-skip" : hasVoted ? "target-picker-voted target-picker-voted-yes" : "target-picker-voted"}
                      title={hasSkipped ? "Пропустил голосование" : hasVoted ? "Уже проголосовал" : "Ещё не проголосовал"}
                    >
                      {hasSkipped ? "–" : hasVoted ? "✓" : "✗"}
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
      </div>

      {voteLines && voteLines.length > 0 && (
        <div className="target-picker-who">
          <p className="target-picker-who-title">Кто за кого</p>
          <ul>
            {voteLines.map((line) => (
              <li key={`${line.voter}-${line.target ?? "skip"}`}>
                <b>{line.voter}</b>
                <span aria-label={line.target ? "голосует против" : "пропускает"}>→</span>
                {line.target ? <b>{line.target}</b> : <i>пропуск</i>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {confirmText && onConfirm && (
        <div className={onSkip ? "target-picker-buttons target-picker-buttons-two" : "target-picker-buttons"}>
          {onSkip && (
            <button type="button" className="btn btn-dark target-picker-skip" onClick={onSkip}>
              Пропустить
            </button>
          )}
          <button className="btn btn-red target-picker-confirm" disabled={selectedId === null || isSent} onClick={onConfirm}>
            {isSent ? (sentText ?? "Выбор отправлен ✓") : confirmText}
          </button>
        </div>
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
