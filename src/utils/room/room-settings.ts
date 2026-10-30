import type { RoleCounts, RoleKey, RoomFull } from "@/utils/api";
import { checkRoles, countCivilians, countRoles, fitRoles, getRoleLimits, MAX_PLAYERS, MIN_PLAYERS, ROLES, sameRoles } from "@/utils/roles";

export type RoleRow = {
  key: RoleKey;
  name: string;
  plural: string;
  image: string;
  count: number;
  stepper: { min: number; max: number; onChange: (value: number) => void } | null;
};

type RoomSettingsOptions = {
  room: RoomFull;
  isOwner: boolean;
  onChange: (changes: Partial<RoomFull>) => void;
};

export function useRoomSettings({ room, isOwner, onChange }: RoomSettingsOptions) {
  const playersCount = room.players.length;
  const limits = getRoleLimits(room.max_players);
  const civilians = countCivilians(room.max_players, room.roles);
  const recommended = countRoles(room.max_players);
  const isRecommended = sameRoles(room.roles, recommended);

  const everyoneReady = !room.readySupported || room.players.every((player) => player.ready || player.username === room.owner);
  const rolesErrorNow = checkRoles(playersCount, room.roles);
  const canStart = playersCount >= MIN_PLAYERS && rolesErrorNow === "" && everyoneReady;

  let startText = "Начать игру";
  if (playersCount < MIN_PLAYERS) startText = `Нужно ещё ${MIN_PLAYERS - playersCount}`;
  else if (rolesErrorNow) startText = "Мало игроков для ролей";
  else if (!everyoneReady) startText = "Ждём готовности";

  function changeMaxPlayers(value: number) {
    const roles = isRecommended ? countRoles(value) : fitRoles(value, room.roles);
    onChange({ max_players: value, roles });
  }

  const roleRows: RoleRow[] = ROLES.map((role) => {
    const isCivilian = role.key === "civilian";
    const key = role.key as keyof RoleCounts;
    const count = isCivilian ? civilians : room.roles[key];
    const limit = isCivilian ? null : limits[key];
    return {
      key: role.key,
      name: role.name,
      plural: role.plural,
      image: role.image,
      count,
      stepper:
        isOwner && limit
          ? {
              min: limit.min,
              max: Math.min(limit.max, count + Math.max(0, civilians)),
              onChange: (value: number) => onChange({ roles: { ...room.roles, [key]: value } }),
            }
          : null,
    };
  });

  return {
    roleRows,
    rolesError: checkRoles(room.max_players, room.roles),
    recommended,
    isRecommended,
    canStart,
    startText,
    minPlayers: Math.max(MIN_PLAYERS, playersCount),
    maxPlayers: MAX_PLAYERS,
    changeMaxPlayers,
    resetRoles: () => onChange({ roles: recommended }),
    changeDayTime: (value: number) => onChange({ day_time: value }),
    changeNightTime: (value: number) => onChange({ night_time: value }),
  };
}
