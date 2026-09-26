"use client";

/*
  RoleReveal — анимация в начале игры: «Какая у меня роль?»
  Карточка лежит рубашкой вверх (логотип), крутится несколько раз
  и останавливается лицом — там картинка вашей роли.

  Как поменять скорость и количество оборотов — смотри role-reveal.scss.
*/
import Image from "next/image";

import type { RoleKey } from "@/lib/api";
import { getRole } from "@/lib/roles";
import "./role-reveal.scss";

type RoleRevealProps = {
  role: RoleKey;
  onClose: () => void;
};

export default function RoleReveal({ role, onClose }: RoleRevealProps) {
  const info = getRole(role);

  return (
    <div className="role-reveal" role="dialog" aria-modal="true" aria-labelledby="role-reveal-title">
      <p className="role-reveal-hint">Ваша роль в этой игре…</p>

      {/* сцена нужна для 3D (perspective) */}
      <div className="role-reveal-scene">
        <div className="role-reveal-card">
          {/* рубашка карты — видна в начале */}
          <div className="role-reveal-face role-reveal-cover">
            <Image src="/img/logo.webp" alt="" width={200} height={200} priority />
          </div>

          {/* лицо карты — видно в конце */}
          <div className="role-reveal-face role-reveal-role">
            <Image src={info.image} alt={info.name} width={600} height={900} priority />
          </div>
        </div>
      </div>

      <div className="role-reveal-text">
        <h2 id="role-reveal-title" className="role-reveal-title">
          Вы — {info.name}
        </h2>
        <p className="role-reveal-about">{info.about}</p>
        <p className="role-reveal-secret">Никому не показывайте свою роль.</p>

        <button className="btn btn-red role-reveal-button" onClick={onClose}>
          В игру
        </button>
      </div>
    </div>
  );
}
