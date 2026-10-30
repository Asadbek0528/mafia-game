import Image from "next/image";

import type { RoomFull } from "@/utils/api";
import { mafiaWord } from "@/utils/format";
import { useRoomSettings } from "@/utils/room/room-settings";
import "./room-settings.scss";

type RoomSettingsProps = {
  room: RoomFull;
  isOwner: boolean;
  isMeReady: boolean;
  onChange: (changes: Partial<RoomFull>) => void;
  onReadyToggle: () => void;
  onStart: () => void;
};

export default function RoomSettings(props: RoomSettingsProps) {
  const { room, isOwner, isMeReady, onChange, onReadyToggle, onStart } = props;

  const { roleRows, rolesError, recommended, isRecommended, canStart, startText, minPlayers, maxPlayers, changeMaxPlayers, resetRoles, changeDayTime, changeNightTime } = useRoomSettings({ room, isOwner, onChange });

  return (
    <section className="panel room-settings">
      <h2 className="panel-title room-settings-title">Настройки</h2>

      <SettingRow
        label="Количество игроков"
        value={room.max_players}
        min={minPlayers}
        max={maxPlayers}
        step={1}
        canEdit={isOwner}
        onChange={changeMaxPlayers}
      />

      <p className="room-settings-label">Роли</p>
      <ul className="room-settings-roles">
        {roleRows.map((role) => (
          <li key={role.key} className="room-settings-role">
            <Image src={role.image} alt={role.name} width={150} height={225} />
            <span className="room-settings-role-name">{role.plural}</span>

            {role.stepper ? (
              <Stepper value={role.count} min={role.stepper.min} max={role.stepper.max} onChange={role.stepper.onChange} />
            ) : (
              <span className={role.count < 0 ? "room-settings-role-count room-settings-role-count-bad" : "room-settings-role-count"}>
                {role.count}
              </span>
            )}
          </li>
        ))}
      </ul>
      {rolesError && <p className="room-settings-error">{rolesError}</p>}

      <p className="room-settings-balance">
        {isRecommended ? "Честный баланс" : "Рекомендуем"} на {room.max_players}:{" "}
        <b>
          {recommended.mafia} {mafiaWord(recommended.mafia)} · {recommended.doctor} доктор · {recommended.commissar} комиссар
        </b>
        {isOwner && !isRecommended && (
          <button type="button" className="btn-link room-settings-balance-reset" onClick={resetRoles}>
            Вернуть
          </button>
        )}
      </p>

      <SettingRow
        label="Время дня"
        value={room.day_time}
        unit=" сек"
        min={30}
        max={180}
        step={10}
        canEdit={isOwner}
        onChange={changeDayTime}
      />

      <SettingRow
        label="Время ночи"
        value={room.night_time}
        unit=" сек"
        min={60}
        max={180}
        step={10}
        canEdit={isOwner}
        onChange={changeNightTime}
      />

      {isOwner && (
        <button className="btn btn-red btn-full room-settings-main-button" disabled={!canStart} onClick={onStart}>
          {startText}
        </button>
      )}

      {!isOwner && room.readySupported && (
        <button
          className={isMeReady ? "btn btn-green btn-full room-settings-main-button" : "btn btn-red btn-full room-settings-main-button"}
          onClick={onReadyToggle}
        >
          {isMeReady ? "Готов ✓" : "Я готов"}
        </button>
      )}

      {!isOwner && !room.readySupported && (
        <p className="room-settings-waiting">
          <span className="room-settings-waiting-dot" aria-hidden="true" />
          Ждём создателя
        </p>
      )}
    </section>
  );
}

type StepperProps = {
  value: number;
  unit?: string;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
};

function Stepper({ value, unit = "", min, max, step = 1, onChange }: StepperProps) {
  return (
    <div className="room-settings-stepper">
      <button type="button" aria-label="Меньше" disabled={value <= min} onClick={() => onChange(value - step)}>
        −
      </button>
      <output className="room-settings-value">
        {value}
        {unit}
      </output>
      <button type="button" aria-label="Больше" disabled={value >= max} onClick={() => onChange(value + step)}>
        +
      </button>
    </div>
  );
}

type SettingRowProps = StepperProps & {
  label: string;
  canEdit: boolean;
};

function SettingRow({ label, canEdit, ...stepper }: SettingRowProps) {
  return (
    <div className="room-settings-row">
      <span>{label}</span>

      {canEdit ? (
        <Stepper {...stepper} />
      ) : (
        <output className="room-settings-value">
          {stepper.value}
          {stepper.unit}
        </output>
      )}
    </div>
  );
}
