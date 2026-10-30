import { avatarLetter, avatarStyle, isPhoto } from "@/utils/widgets/avatar";

import "./avatar.scss";

type AvatarProps = {
  name: string;
  size?: number;
  image?: string | null;
  empty?: boolean;
};

export default function Avatar({ name, size = 40, image, empty = false }: AvatarProps) {
  if (empty) {
    return (
      <span className="avatar avatar-empty" style={{ width: size, height: size }}>
        ?
      </span>
    );
  }

  if (isPhoto(image)) {
    return (
      <img className="avatar avatar-photo" src={image} alt="" width={size} height={size} style={{ width: size, height: size }} />
    );
  }

  return (
    <span
      className="avatar"
      style={avatarStyle(name, size)}
      aria-hidden="true"
    >
      {avatarLetter(name)}
    </span>
  );
}
