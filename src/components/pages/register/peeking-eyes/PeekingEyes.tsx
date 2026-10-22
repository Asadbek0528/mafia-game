"use client";

import { useEffect, useRef, useState } from "react";

import "./peeking-eyes.scss";

type Mood = "watch" | "closed" | "peek";

// Мафиози выглядывает из-за карточки и следит за вами:
// глаза идут за курсором или за полем, в котором вы печатаете;
// на пароле зажмуривается, а если пароль показать — подглядывает; при ошибке злится.
export default function PeekingEyes({ isAngry }: { isAngry: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mood, setMood] = useState<Mood>("watch");

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let focusTarget: HTMLElement | null = null;

    // Зрачки смещаем через CSS-переменные — без перерисовки React на каждое движение мыши
    function lookAt(x: number, y: number) {
      if (!root) return;
      const box = root.getBoundingClientRect();
      const cx = box.left + box.width / 2;
      const cy = box.top + box.height * 0.6;
      const dx = x - cx;
      const dy = y - cy;
      const length = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, length / 220);
      root.style.setProperty("--look-x", `${((dx / length) * 2.6 * reach).toFixed(2)}px`);
      root.style.setProperty("--look-y", `${((dy / length) * 1.6 * reach).toFixed(2)}px`);
    }

    function lookAtFocus() {
      if (!focusTarget) return;
      const box = focusTarget.getBoundingClientRect();
      lookAt(box.left + Math.min(box.width * 0.35, 140), box.top + box.height / 2);
    }

    function updateMood() {
      const input = document.activeElement;
      if (input instanceof HTMLInputElement && input.id === "password") {
        setMood(input.type === "password" ? "closed" : "peek");
      } else {
        setMood("watch");
      }
    }

    const onMove = (event: PointerEvent) => {
      if (!focusTarget) lookAt(event.clientX, event.clientY);
    };
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      focusTarget = target instanceof HTMLInputElement ? target : null;
      lookAtFocus();
      updateMood();
    };
    const onFocusOut = () => {
      focusTarget = null;
      setTimeout(updateMood, 0);
    };
    // Кнопка «глаз» меняет type у поля пароля — следим за этим
    const observer = new MutationObserver(updateMood);
    const password = document.getElementById("password");
    if (password) observer.observe(password, { attributes: true, attributeFilter: ["type"] });

    window.addEventListener("pointermove", onMove);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    window.addEventListener("input", lookAtFocus);
    return () => {
      observer.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("input", lookAtFocus);
    };
  }, []);

  let className = `peeking-eyes peeking-eyes-${mood}`;
  if (isAngry) className += " peeking-eyes-angry";

  return (
    <div ref={rootRef} className={className} aria-hidden="true">
      <svg className="peeking-eyes-figure" viewBox="0 0 96 64">
        <defs>
          <radialGradient id="peeking-eye-glow" cx="0.5" cy="0.45" r="0.6">
            <stop offset="0" stopColor="#fff1c7" />
            <stop offset="0.35" stopColor="#ffb02e" />
            <stop offset="1" stopColor="#e0202b" />
          </radialGradient>
        </defs>

        {/* Голова в тени и шляпа */}
        <ellipse className="peeking-eyes-head" cx="48" cy="50" rx="21" ry="22" />
        <path className="peeking-eyes-hat" d="M28 25c0-11 4.5-19 20-19s20 8 20 19Z" />
        <path className="peeking-eyes-band" d="M28.6 20.5h38.8V25H28.6Z" />
        <ellipse className="peeking-eyes-brim" cx="48" cy="26" rx="34" ry="5" />

        {/* Глаза: светятся в темноте, зрачки следят */}
        <g className="peeking-eyes-eye">
          <ellipse cx="40" cy="38" rx="5" ry="3.1" fill="url(#peeking-eye-glow)" />
          <circle className="peeking-eyes-pupil" cx="40" cy="38" r="1.5" />
          <rect className="peeking-eyes-lid" x="34" y="34" width="12" height="8" />
        </g>
        <g className="peeking-eyes-eye">
          <ellipse cx="56" cy="38" rx="5" ry="3.1" fill="url(#peeking-eye-glow)" />
          <circle className="peeking-eyes-pupil" cx="56" cy="38" r="1.5" />
          <rect className="peeking-eyes-lid" x="50" y="34" width="12" height="8" />
        </g>

        {/* Брови — только когда злится */}
        <path className="peeking-eyes-brow" d="M34.5 32.5 45 35M61.5 32.5 51 35" />
      </svg>
    </div>
  );
}
