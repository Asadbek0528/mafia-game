/*
  Hero — большой баннер сверху главной страницы.
  Кнопки: «Начать игру» и «Создать комнату».
*/
import "./hero.scss";

type HeroProps = {
  onPlay: () => void;
  onCreateRoom: () => void;
};

export default function Hero({ onPlay, onCreateRoom }: HeroProps) {
  return (
    <section className="hero">
      <div className="hero-content">
        <h1 className="hero-title">Mafia</h1>
        <p className="hero-subtitle">Обман. Подозрение. Выживание.</p>

        <div className="hero-buttons">
          <button className="btn btn-red hero-play" onClick={onPlay}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 4v16l13-8z" />
            </svg>
            Начать игру
          </button>

          <button className="btn btn-dark" onClick={onCreateRoom}>
            Создать комнату
          </button>
        </div>
      </div>
    </section>
  );
}
