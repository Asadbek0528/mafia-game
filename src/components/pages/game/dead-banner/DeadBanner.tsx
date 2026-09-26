import "./dead-banner.scss";

export default function DeadBanner() {
  return (
    <div className="dead-banner" role="status">
      <p className="dead-banner-title">Вы погибли</p>
      <p className="dead-banner-text">
        Теперь вы наблюдатель: видите роли всех игроков и пишете в чат погибших. Живые его не видят.
      </p>
    </div>
  );
}
