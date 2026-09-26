import type { RoleCounts, RoleKey } from "./api";

export type Role = {
  key: RoleKey;
  name: string;
  plural: string;
  image: string;
  about: string;
  nightTask: string;
};

export const ROLES: Role[] = [
  {
    key: "mafia",
    name: "Мафия",
    plural: "Мафия",
    image: "/img/role-mafia.webp",
    about: "Ночью вместе выбирает жертву. Днём притворяется жителем.",
    nightTask: "Выберите жертву",
  },
  {
    key: "doctor",
    name: "Доктор",
    plural: "Доктор",
    image: "/img/role-doctor.webp",
    about: "Каждую ночь лечит одного игрока. Если мафия выбрала его — он выживет.",
    nightTask: "Кого вылечить этой ночью?",
  },
  {
    key: "commissar",
    name: "Комиссар",
    plural: "Комиссар",
    image: "/img/role-commissar.webp",
    about: "Каждую ночь проверяет одного игрока и узнаёт, мафия он или нет.",
    nightTask: "Кого проверить этой ночью?",
  },
  {
    key: "civilian",
    name: "Житель",
    plural: "Жители",
    image: "/img/role-citizen.webp",
    about: "Ночью спит. Днём ищет мафию в чате и голосует.",
    nightTask: "Город спит. Дождитесь утра.",
  },
];

export function getRole(key: RoleKey): Role {
  return ROLES.find((role) => role.key === key) ?? ROLES[3];
}

export const DEFAULT_TIMES = {
  day: 90,
  night: 60,
  voting: 45,
};

export const MIN_PLAYERS = 4;

export function countRoles(players: number): RoleCounts {
  return {
    mafia: Math.max(1, Math.floor(players / 3.5)),
    doctor: players >= 4 ? 1 : 0,
    commissar: players >= 5 ? 1 : 0,
  };
}

export function countCivilians(players: number, roles: RoleCounts): number {
  return players - roles.mafia - roles.doctor - roles.commissar;
}

export function getRoleLimits(players: number) {
  return {
    mafia: { min: 1, max: Math.max(1, Math.ceil(players / 2) - 1) },
    doctor: { min: 0, max: 2 },
    commissar: { min: 0, max: 2 },
  };
}

export function checkRoles(players: number, roles: RoleCounts): string {
  const civilians = countCivilians(players, roles);

  if (roles.mafia < 1) return "Нужна хотя бы 1 мафия.";
  if (civilians < 0) return `Ролей больше, чем игроков. Уберите ${-civilians}.`;
  if (roles.mafia * 2 >= players) return "Мафии должно быть меньше половины игроков.";
  return "";
}
