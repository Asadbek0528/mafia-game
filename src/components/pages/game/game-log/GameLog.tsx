/*
  GameLog — что произошло в игре: «Ночью убит fox», «Город выгнал max» ...
  Новые события сверху.

  Чата пока нет: в API нет WebSocket. Когда backend его сделает —
  здесь появится поле для сообщений.
*/
import "./game-log.scss";

type GameLogProps = {
  events: string[];
};

export default function GameLog({ events }: GameLogProps) {
  return (
    <section className="game-log">
      <h2 className="game-log-title">События</h2>

      {events.length === 0 ? (
        <p className="game-log-empty">Пока ничего не произошло.</p>
      ) : (
        <ul className="game-log-list">
          {[...events].reverse().map((event, index) => (
            <li key={events.length - index} className={index === 0 ? "game-log-item game-log-item-new" : "game-log-item"}>
              {event}
            </li>
          ))}
        </ul>
      )}

      <div className="game-log-chat">
        <input className="input" placeholder="Чат появится скоро…" disabled />
      </div>
    </section>
  );
}
