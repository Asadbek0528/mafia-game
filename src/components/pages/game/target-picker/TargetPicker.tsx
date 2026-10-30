import Avatar from "@/components/pages/widgets/avatar/Avatar";
import PlayerBackground from "@/components/pages/widgets/player-background/PlayerBackground";
import { useTargetPicker } from "@/utils/game/target-picker";
import type { TargetPickerData } from "@/utils/game/types";
import "./target-picker.scss";

type TargetPickerProps = TargetPickerData & {
  headerButton?: React.ReactNode;
};

export default function TargetPicker(props: TargetPickerProps) {
  const { title, subtitle, players, selectedId, isSent, isUrgent, confirmText, headerButton, onSelect, onConfirm, voteLines, sentText, onSkip } = props;
  const { aliveCount, arrows, selectedSeat, items, isCrowded } = useTargetPicker(props);

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
            <path key={arrow.key} className="target-picker-arrow" d={arrow.d} markerEnd="url(#target-picker-arrow)" vectorEffect="non-scaling-stroke" />
          ))}
          {selectedSeat && arrows.length === 0 && (
            <line className="target-picker-pointer" x1="50" y1="50" x2={selectedSeat.x} y2={selectedSeat.y} vectorEffect="non-scaling-stroke" />
          )}
        </svg>

        <ul className="target-picker-list">
          {items.map((item) => (
            <li key={item.player.id} className="target-picker-item" style={item.style}>
              <button
                type="button"
                className={item.className}
                disabled={!item.isSelectable}
                onClick={() => onSelect(item.player.id)}
                aria-pressed={item.isSelected}
              >
                <PlayerBackground id={item.background} />
                <Avatar name={item.player.username} size={56} />
                <span className="target-picker-name">
                  {item.player.isAlive ? <i className="target-picker-dot" aria-hidden="true" /> : <SkullIcon />}
                  <span>{item.player.username}</span>
                </span>

                {item.isMe && <span className="target-picker-me">Вы</span>}
                {item.mark && (
                  <span className={item.mark.tone === "mafia" ? "target-picker-chip target-picker-chip-mafia" : "target-picker-chip target-picker-chip-checked"} title="Ваша проверка">
                    {item.mark.tone === "mafia" ? "🔍 Мафия" : "🔍 Мирный"}
                  </span>
                )}
                {item.roleChip && <span className={item.roleChip.className}>{item.roleChip.name}</span>}
                {item.deathLabel && <span className="target-picker-chip target-picker-chip-dead">{item.deathLabel}</span>}
                {item.voted && (
                  <span className={item.voted.className} title={item.voted.title}>
                    {item.voted.symbol}
                  </span>
                )}
                {item.votesText && (
                  <span className="target-picker-votes" title="Голосов против этого игрока">
                    <VoteIcon /> {item.votesText}
                  </span>
                )}
              </button>
            </li>
          ))}
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
