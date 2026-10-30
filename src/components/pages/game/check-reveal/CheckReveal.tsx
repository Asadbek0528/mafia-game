"use client";

import Avatar from "@/components/pages/widgets/avatar/Avatar";
import type { CheckRevealInfo } from "@/utils/game/types";

import "./check-reveal.scss";

type CheckRevealProps = {
  info: CheckRevealInfo | null;
  onClose: () => void;
};

export default function CheckReveal({ info, onClose }: CheckRevealProps) {
  if (!info) return null;

  return (
    <div className="check-reveal" role="alertdialog" aria-labelledby="check-reveal-title" onClick={onClose}>
      <div key={info.key} className={info.isMafia ? "check-reveal-card check-reveal-card-mafia" : "check-reveal-card"} onClick={(event) => event.stopPropagation()}>
        <p className="check-reveal-label">🔍 Результат проверки</p>
        <Avatar name={info.name} size={88} />
        <p id="check-reveal-title" className="check-reveal-name">
          {info.name}
        </p>
        <p className="check-reveal-stamp">{info.isMafia ? "Мафия" : "Не мафия"}</p>
        <p className="check-reveal-text">
          {info.isMafia ? "Убедите город выгнать его днём. Только не раскрывайте себя слишком рано." : "Этому игроку можно доверять."}
        </p>
        <button type="button" className="btn btn-red btn-full" onClick={onClose} autoFocus>
          Понятно
        </button>
      </div>
    </div>
  );
}
