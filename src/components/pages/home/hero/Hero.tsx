import "./hero.scss";

type HeroProps = {
  openRooms: number | null;
  onPlay: () => void;
  onCreateRoom: () => void;
};

export default function Hero({ openRooms, onPlay, onCreateRoom }: HeroProps) {
  return (
    <section className="hero">
      <div className="hero-content">
        <p className="hero-eyebrow">
          <span className="hero-live" aria-hidden="true" />
          {openRooms === null ? "Город засыпает…" : openRooms > 0 ? `Открыто комнат: ${openRooms}` : "Город ждёт игроков"}
        </p>

        <h1 className="hero-title">Mafia</h1>
        <p className="hero-subtitle">Обман. Подозрение. Выживание.</p>

        <div className="hero-buttons">
          <button className="btn btn-red hero-play" onClick={onPlay}>
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.4-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5Z" />
            </svg>
            Играть
          </button>

          <button className="btn btn-dark hero-create" onClick={onCreateRoom}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Создать комнату
          </button>
        </div>
      </div>
    </section>
  );
}
