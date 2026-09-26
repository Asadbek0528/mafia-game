import Image from "next/image";

import type { RoleCounts, RoomFull } from "@/lib/api";
import { checkRoles, countCivilians, countRoles, getRoleLimits, MIN_PLAYERS, ROLES } from "@/lib/roles";
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

  const playersCount = room.players.length;
  const limits = getRoleLimits(room.max_players);
  const civilians = countCivilians(room.max_players, room.roles);

  const rolesError = checkRoles(room.max_players, room.roles);

  const everyoneReady = !room.readySupported || room.players.every((player) => player.ready || player.username === room.owner);
  const rolesErrorNow = checkRoles(playersCount, room.roles);
  const canStart = playersCount >= MIN_PLAYERS && rolesErrorNow === "" && everyoneReady;

  let hint = "";
  if (isOwner) {
    if (playersCount < MIN_PLAYERS) hint = `Нужно минимум ${MIN_PLAYERS} игрока — сейчас ${playersCount}.`;
    else if (rolesErrorNow) hint = `Игроков пока ${playersCount}: ${rolesErrorNow}`;
    else if (!everyoneReady) hint = "Ждём, пока все нажмут «Готов».";
    else hint = "Всё готово. Можно начинать.";
  } else if (room.readySupported) {
    hint = isMeReady ? "Ждём создателя комнаты." : "Нажмите, когда будете готовы.";
  } else {
    hint = "Ждём, когда создатель начнёт игру.";
  }

  function changeMaxPlayers(value: number) {
    let roles = room.roles;
    if (checkRoles(value, roles) !== "") {
      roles = countRoles(value);
    }
    onChange({ max_players: value, roles });
  }

  function changeRole(key: keyof RoleCounts, value: number) {
    onChange({ roles: { ...room.roles, [key]: value } });
  }

  return (
    <section className="panel room-settings">
      <h2 className="panel-title room-settings-title">Настройки игры</h2>
      {!isOwner && <p className="room-settings-note">Настройки меняет только создатель комнаты.</p>}

      <SettingRow
        label="Количество игроков"
        value={room.max_players}
        min={Math.max(MIN_PLAYERS, playersCount)}
        max={16}
        step={1}
        canEdit={isOwner}
        onChange={changeMaxPlayers}
      />

      <p className="room-settings-label">Роли</p>
      <ul className="room-settings-roles">
        {ROLES.map((role) => {
          const isCivilian = role.key === "civilian";
          const count = isCivilian ? civilians : room.roles[role.key as keyof RoleCounts];
          const limit = isCivilian ? null : limits[role.key as keyof RoleCounts];

          return (
            <li key={role.key} className="room-settings-role">
              <Image src={role.image} alt={role.name} width={150} height={225} />
              <span className="room-settings-role-name">{role.plural}</span>

              {isOwner && limit ? (
                <Stepper
                  value={count}
                  min={limit.min}
                  max={limit.max}
                  onChange={(value) => changeRole(role.key as keyof RoleCounts, value)}
                />
              ) : (
                <span className={count < 0 ? "room-settings-role-count room-settings-role-count-bad" : "room-settings-role-count"}>
                  {count}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {rolesError && <p className="room-settings-error">{rolesError}</p>}

      <SettingRow
        label="Время дня"
        value={room.day_time}
        unit=" сек"
        min={30}
        max={180}
        step={10}
        canEdit={isOwner}
        onChange={(value) => onChange({ day_time: value })}
      />

      <SettingRow
        label="Время ночи"
        value={room.night_time}
        unit=" сек"
        min={30}
        max={120}
        step={10}
        canEdit={isOwner}
        onChange={(value) => onChange({ night_time: value })}
      />

      {isOwner && (
        <button className="btn btn-red btn-full room-settings-main-button" disabled={!canStart} onClick={onStart}>
          Начать игру
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

      <p className="room-settings-hint">{hint}</p>
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
