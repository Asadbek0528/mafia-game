/*
  Avatar — круглая аватарка с первой буквой имени.
  Цвет считается из имени, поэтому у каждого игрока свой цвет.

  Пример: <Avatar name="darkness" size={40} />
*/
import "./avatar.scss";

type AvatarProps = {
  name: string;
  size?: number; // размер в пикселях, по умолчанию 40
  empty?: boolean; // пустое место в комнате (пунктир и "?")
};

// из имени получаем число 0–359 (оттенок цвета)
function getColorFromName(name: string): number {
  let hue = 0;
  for (const letter of name) {
    hue = (hue * 31 + letter.charCodeAt(0)) % 360;
  }
  return hue;
}

export default function Avatar({ name, size = 40, empty = false }: AvatarProps) {
  if (empty) {
    return (
      <span className="avatar avatar-empty" style={{ width: size, height: size }}>
        ?
      </span>
    );
  }

  const hue = getColorFromName(name);
  const letter = name.replace("Гость_", "Г").charAt(0).toUpperCase();

  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `radial-gradient(circle at 30% 25%, hsl(${hue} 45% 32%), hsl(${hue} 55% 10%))`,
      }}
      aria-hidden="true"
    >
      {letter}
    </span>
  );
}
