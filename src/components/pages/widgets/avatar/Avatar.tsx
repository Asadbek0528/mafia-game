import "./avatar.scss";

type AvatarProps = {
  name: string;
  size?: number;
  image?: string | null;
  empty?: boolean;
};

function getColorFromName(name: string): number {
  let hue = 0;
  for (const letter of name) {
    hue = (hue * 31 + letter.charCodeAt(0)) % 360;
  }
  return hue;
}

export default function Avatar({ name, size = 40, image, empty = false }: AvatarProps) {
  if (empty) {
    return (
      <span className="avatar avatar-empty" style={{ width: size, height: size }}>
        ?
      </span>
    );
  }

  if (image && /^(data:image\/|https?:\/\/|\/)/.test(image)) {
    return (
      <img className="avatar avatar-photo" src={image} alt="" width={size} height={size} style={{ width: size, height: size }} />
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
