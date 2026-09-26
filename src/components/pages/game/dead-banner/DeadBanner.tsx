import "./dead-banner.scss";

export default function DeadBanner() {
  return (
    <div className="dead-banner" role="status">
      <p className="dead-banner-title">Вы погибли</p>
      <p className="dead-banner-text">Теперь вы наблюдатель. Вы не можете голосовать и действовать ночью.</p>
    </div>
  );
}
