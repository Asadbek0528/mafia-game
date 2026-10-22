import "./room-omen.scss";

// Страшная карточка под «Пригласить»: заполняет пустое место и задаёт настроение перед игрой
export default function RoomOmen() {
  return (
    <aside className="room-omen" aria-hidden="true">
      <div className="room-omen-art" />
      <div className="room-omen-rain" />
      <div className="room-omen-lamp" />

      <div className="room-omen-text">
        <p className="room-omen-title">Один из вас — убийца</p>
        <p className="room-omen-subtitle">Зови тех, кому доверяешь. Если такие ещё остались.</p>
      </div>
    </aside>
  );
}
