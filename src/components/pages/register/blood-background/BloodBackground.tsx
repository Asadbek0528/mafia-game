import BloodVideo from "./BloodVideo";
import "./blood-background.scss";

export default function BloodBackground() {
  return (
    <div className="blood-background" aria-hidden="true">
      <BloodVideo />
      <div className="blood-grain" />
      <div className="blood-shadow" />
    </div>
  );
}
