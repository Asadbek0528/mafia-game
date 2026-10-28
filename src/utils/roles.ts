import type { RoleCounts, RoleKey } from "./api";

export type Role = {
  key: RoleKey;
  name: string;
  plural: string;
  image: string;
  about: string;
  team: "mafia" | "town";
  tagline: string;
  story: string;
  abilities: string[];
  goal: string;
  tips: string[];
};

export const ROLES: Role[] = [
  {
    key: "mafia",
    name: "Мафия",
    plural: "Мафия",
    image: "/img/roles-v3/mafia.webp",
    about: "Ночью вместе выбирает жертву. Днём притворяется жителем.",
    team: "mafia",
    tagline: "Ты ночью убиваешь. Твоя цель — не дать им выжить.",
    story:
      "Днём он улыбается соседям, пьёт кофе в том же баре и громче всех возмущается очередной смертью. Но когда город засыпает, он надевает шляпу и выходит на улицу. У мафии нет друзей — есть только те, кто пока полезен. Каждое утро кто-то не просыпается, и каждый раз мафия делает вид, что потрясена не меньше других.",
    abilities: [
      "Каждую ночь мафия выбирает одну жертву на всех — если доктор её не спасёт, утром она погибнет.",
      "Знает, кто остальные мафиози, — остальные игроки не знают, кто мафия.",
      "Днём ведёт себя как обычный житель: обвиняет, защищается, обманывает и голосует вместе со всеми.",
    ],
    goal: "Остаться в городе так, чтобы мафии было не меньше, чем мирных жителей.",
    tips: [
      "Не молчи днём — тишина вызывает подозрения.",
      "Голосуй вместе с большинством, но не будь первым, кто обвиняет.",
      "Убивай тех, кто слишком близко подобрался к правде.",
    ],
  },
  {
    key: "doctor",
    name: "Доктор",
    plural: "Доктор",
    image: "/img/roles-v3/doctor.webp",
    about: "Каждую ночь лечит одного игрока. Если мафия выбрала его — он выживет.",
    team: "town",
    tagline: "Ты спасаешь жизни. Но твоя помощь — только одному.",
    story:
      "В маленькой клинике на окраине свет горит до утра. Доктор знает: этой ночью кто-то снова придёт с ножом, и он может спасти только одного. Он никогда не говорит, кого выбрал, — мафия не должна узнать, кто стоит между ней и её жертвой. Иногда он угадывает. И тогда утром город просыпается целым.",
    abilities: [
      "Каждую ночь лечит одного игрока, в том числе себя. Если докторов двое — лечат одного на двоих.",
      "Если мафия выбрала того же игрока — он выживет, а утром все узнают, что доктор спас жертву.",
    ],
    goal: "Помочь городу найти и выгнать всю мафию.",
    tips: [
      "Не раскрывай, что ты доктор, — мафия уберёт тебя первым.",
      "Лечи тех, кто днём был самым активным: их мафия боится больше всех.",
      "Иногда спасай себя — особенно если тебя начали подозревать.",
    ],
  },
  {
    key: "commissar",
    name: "Комиссар",
    plural: "Комиссар",
    image: "/img/roles-v3/commissar.webp",
    about: "Каждую ночь проверяет одного игрока и узнаёт, мафия он или нет.",
    team: "town",
    tagline: "Ты ищешь правду. Твоя задача — найти мафию.",
    story:
      "На стене его кабинета — фотографии всех жителей, соединённые красными нитями. Комиссар не спит ночами: он проверяет по одному подозреваемому и узнаёт правду. Но правда опасна. Если мафия поймёт, кто задаёт вопросы, комиссар станет следующим. Поэтому днём он говорит осторожно — и ведёт город к правильному ответу.",
    abilities: [
      "Каждую ночь проверяет одного игрока и сразу узнаёт: мафия он или нет. Если комиссаров двое — проверка одна на двоих.",
      "Результат видит только комиссар — остальные узнают, только если он расскажет.",
      "Никого не может убить — только проверяет.",
    ],
    goal: "Вычислить мафию и убедить город проголосовать против неё.",
    tips: [
      "Не спеши раскрываться: найди мафию и только потом говори.",
      "Проверяй тех, кто уверенно обвиняет других.",
      "Если тебя вот-вот выгонят — расскажи, кого проверил. Это твой последний шанс.",
    ],
  },
  {
    key: "civilian",
    name: "Житель",
    plural: "Жители",
    image: "/img/roles-v3/citizen.webp",
    about: "Ночью спит. Днём ищет мафию в чате и голосует.",
    team: "town",
    tagline: "Ты просто живёшь. Но твой голос может решить всё.",
    story:
      "У жителя нет ни пистолета, ни лекарств, ни досье. Ночью он запирает дверь и надеется дожить до утра. Но именно жители решают судьбу города: днём они спорят, замечают ложь и голосуют. Одна неверная ошибка — и вместо мафии город выгонит своего. Одно верное подозрение — и мафия проиграет.",
    abilities: [
      "Ночью спит — у жителя нет ночного действия.",
      "Днём обсуждает, ставит «глаз» подозрения и голосует, кого выгнать.",
    ],
    goal: "Найти и выгнать всю мафию, пока она не захватила город.",
    tips: [
      "Следи, кто за кого голосует, — мафия часто защищает своих.",
      "Задавай вопросы: кто уходит от ответа, тот подозрителен.",
      "Не голосуй наугад — каждый выгнанный житель помогает мафии.",
    ],
  },
];

export function getRole(key: RoleKey): Role {
  return ROLES.find((role) => role.key === key) ?? ROLES[3];
}

export const DEFAULT_TIMES = {
  day: 120,
  night: 90,
  voting: 60,
};

export const NIGHT_TURN_SECONDS = 30;

export const NIGHT_TURNS: { role: RoleKey; title: string }[] = [
  { role: "mafia", title: "Мафия" },
  { role: "doctor", title: "Доктор" },
  { role: "commissar", title: "Комиссар" },
];

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 16;

// Рекомендуемый баланс: мафии примерно четверть стола, по одному доктору и комиссару.
// 4 → 1/1/0, 6 → 2/1/1, 8 → 2/1/1, 10 → 3/1/1, 12 → 3/1/1, 14 → 4/1/1, 16 → 4/1/1
export function countRoles(players: number): RoleCounts {
  return {
    mafia: Math.max(1, Math.round(players / 4)),
    doctor: players >= 4 ? 1 : 0,
    commissar: players >= 5 ? 1 : 0,
  };
}

export function countCivilians(players: number, roles: RoleCounts): number {
  return players - roles.mafia - roles.doctor - roles.commissar;
}

// Сколько каждой роли создатель может поставить сам. Строгих правил нет —
// только мафии меньше половины стола. «Честный баланс» (countRoles) — лишь рекомендация.
export function getRoleLimits(players: number) {
  return {
    mafia: { min: 1, max: Math.max(1, Math.ceil(players / 2) - 1) },
    doctor: { min: 0, max: 3 },
    commissar: { min: 0, max: 3 },
  };
}

// Подгоняем роли под новое число игроков: всё, что выше лимита, срезаем
export function fitRoles(players: number, roles: RoleCounts): RoleCounts {
  const limits = getRoleLimits(players);
  const fitted = {
    mafia: Math.min(Math.max(roles.mafia, limits.mafia.min), limits.mafia.max),
    doctor: Math.min(roles.doctor, limits.doctor.max),
    commissar: Math.min(roles.commissar, limits.commissar.max),
  };
  return checkRoles(players, fitted) === "" ? fitted : countRoles(players);
}

export function sameRoles(a: RoleCounts, b: RoleCounts): boolean {
  return a.mafia === b.mafia && a.doctor === b.doctor && a.commissar === b.commissar;
}

export function checkRoles(players: number, roles: RoleCounts): string {
  const civilians = countCivilians(players, roles);

  if (roles.mafia < 1) return "Нужна хотя бы 1 мафия.";
  if (civilians < 0) return `Ролей больше, чем игроков. Уберите ${-civilians}.`;
  if (roles.mafia * 2 >= players) return "Мафии должно быть меньше половины игроков.";
  return "";
}
