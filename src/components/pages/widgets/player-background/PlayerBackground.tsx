import type { BackgroundId } from "@/utils/shop";
import "./player-background.scss";

export default function PlayerBackground({ id }: { id: BackgroundId | null }) {
  if (!id) return null;
  return <span className={`player-bg player-bg-${id}`} aria-hidden="true" />;
}
