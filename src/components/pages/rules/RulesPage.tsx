import Link from "next/link";

import { DEFAULT_TIMES, NIGHT_TURN_SECONDS, ROLES } from "@/lib/roles";
import "./rules-page.scss";

const WIN_RULES = [
  { team: "Жители", text: "побеждают, когда вся мафия выбыла из города." },
  { team: "Мафия", text: "побеждает, когда мафии столько же или больше, чем всех остальных живых игроков." },
];

const ETIQUETTE = [
  "Никому не показывайте свою роль и экран.",
  "Погибшие не подсказывают живым — для них есть отдельный чат погибших.",
  "Спорьте с игроками, а не оскорбляйте людей.",
  "Не выходите из игры посреди партии — без вас город может проиграть.",
];

export default function RulesPage() {
  return (
    <main className="rules-page">
      <h1 className="rules-page-title">Правила</h1>
      <p className="rules-page-subtitle">
        Мафия — игра на обман и логику. Город засыпает, мафия выходит на охоту, а днём все вместе ищут, кто из соседей
        убийца.
      </p>

      <section className="rules-page-section">
        <h2 className="rules-page-heading">Цель</h2>
        <ul className="rules-page-win">
          {WIN_RULES.map((rule) => (
            <li key={rule.team}>
              <b>{rule.team}</b> {rule.text}
            </li>
          ))}
        </ul>
      </section>

      <section className="rules-page-section">
        <h2 className="rules-page-heading">Как идёт игра</h2>
        <ol className="rules-page-steps">
          <li>
            <h3>Раздача ролей</h3>
            <p>Каждый получает случайную роль. Мафия знает, кто остальные мафиози. Остальные не знают, кто мафия.</p>
          </li>
          <li>
            <h3>🌙 Ночь — {DEFAULT_TIMES.night} сек</h3>
            <p>
              Город спит, чат закрыт. Роли ходят по очереди, у каждой до {NIGHT_TURN_SECONDS} сек: сначала мафия выбирает
              жертву, потом доктор лечит, потом комиссар проверяет. Как только роль сделала выбор, ход сразу переходит
              дальше.
            </p>
          </li>
          <li>
            <h3>☀️ День — {DEFAULT_TIMES.day} сек</h3>
            <p>
              Город узнаёт, кто погиб ночью, или что доктор спас жертву. Все обсуждают в чате, кто может быть мафией.
              Значком «глаз» можно показать, кого вы подозреваете.
            </p>
          </li>
          <li>
            <h3>🗳 Голосование — {DEFAULT_TIMES.voting} сек</h3>
            <p>
              Каждый живой игрок голосует против одного игрока. Кто набрал больше всех голосов — выбывает. Если голоса
              разделились поровну — никто не выбывает. Потом снова наступает ночь.
            </p>
          </li>
          <li>
            <h3>Выбывшие</h3>
            <p>
              Убитые ночью и выгнанные днём становятся наблюдателями: видят все роли, пишут только в чат погибших и больше
              не голосуют.
            </p>
          </li>
        </ol>
        <p className="rules-page-note">Время дня и ночи создатель комнаты может поменять в настройках комнаты.</p>
      </section>

      <section className="rules-page-section">
        <h2 className="rules-page-heading">Роли</h2>
        <ul className="rules-page-roles">
          {ROLES.map((role) => (
            <li key={role.key} className={`rules-page-role rules-page-role-${role.team}`}>
              <h3>{role.name}</h3>
              <ul>
                {role.abilities.map((ability) => (
                  <li key={ability}>{ability}</li>
                ))}
              </ul>
              <p>
                <b>Цель:</b> {role.goal}
              </p>
            </li>
          ))}
        </ul>
        <Link className="btn btn-dark btn-small" href="/roles">
          Карточки ролей
        </Link>
      </section>

      <section className="rules-page-section">
        <h2 className="rules-page-heading">Честная игра</h2>
        <ul className="rules-page-list">
          {ETIQUETTE.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
