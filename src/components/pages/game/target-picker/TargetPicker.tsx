/*
  TargetPicker — сетка игроков.
  Используется для всего, где нужно выбрать игрока:
  - ночью (мафия / доктор / комиссар)
  - на голосовании
  и просто чтобы посмотреть, кто жив (без кнопки).

  Мёртвые игроки — серые и зачёркнутые.
*/
import Avatar from "@/components/pages/widgets/avatar/Avatar";
import type { GamePlayer } from "@/lib/api";
import { getRole } from "@/lib/roles";
import "./target-picker.scss";

type TargetPickerProps = {
  title: string;
  subtitle?: string;
  players: GamePlayer[]; // кого показать
  selectableIds: number[]; // кого можно выбрать (пусто = просто смотреть)
  selectedId: number | null;
  meId: number | null;
  isSent: boolean; // выбор уже отправлен
  confirmText?: string; // текст кнопки (нет текста — нет кнопки)
  showRole: (player: GamePlayer) => boolean; // видно ли роль этого игрока
  onSelect: (playerId: number) => void;
  onConfirm?: () => void;
};

export default function TargetPicker(props: TargetPickerProps) {
  const { title, subtitle, players, selectableIds, selectedId, meId, isSent, confirmText, showRole, onSelect, onConfirm } = props;

  const canChoose = selectableIds.length > 0 && !isSent;

  return (
    <section className="target-picker">
      <h2 className="target-picker-title">{title}</h2>
      {subtitle && <p className="target-picker-subtitle">{subtitle}</p>}

      <ul className="target-picker-list">
        {players.map((player) => {
          const isSelectable = canChoose && selectableIds.includes(player.id);
          const isSelected = player.id === selectedId;

          // собираем классы
          let className = "target-picker-player";
          if (!player.isAlive) className += " target-picker-player-dead";
          if (isSelectable) className += " target-picker-player-selectable";
          if (isSelected) className += " target-picker-player-selected";

          return (
            <li key={player.id}>
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

                {/* роль видна: моя, союзники-мафия, мёртвые, конец игры */}
                {showRole(player) && player.role && <span className="target-picker-role">{getRole(player.role).name}</span>}
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
