import BloodVideo from "./BloodVideo";
import "./blood-background.scss";

// Фон регистрации: настоящая кровь из видео, зерно старой плёнки и виньетка.
// Ничего лишнего — главное на странице карточка и мафиози за ней.
export default function BloodBackground() {
  return (
    <div className="blood-background" aria-hidden="true">
      <BloodVideo />
      <div className="blood-grain" />
      <div className="blood-shadow" />
    </div>
  );
}
