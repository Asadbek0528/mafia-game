"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import BloodBackground from "./blood-background/BloodBackground";
import PeekingEyes from "./peeking-eyes/PeekingEyes";
import RegisterForm from "./register-form/RegisterForm";
import "./register-page.scss";

type Mode = "register" | "login";

const MODES: { key: Mode; title: string; subtitle: string }[] = [
  { key: "register", title: "Регистрация", subtitle: "Создай аккаунт, пока город спит." },
  { key: "login", title: "Вход", subtitle: "Город ждал тебя." },
];

// Индекс в углу, как на картах ролей: корона и «M»
function CardIndex({ position }: { position: "top" | "bottom" }) {
  return (
    <span className={`register-card-index register-card-index-${position}`} aria-hidden="true">
      <svg viewBox="0 0 24 14" fill="currentColor">
        <path d="M2 13 0 3l6 4 6-7 6 7 6-4-2 10Z" />
      </svg>
      M
    </span>
  );
}

export default function RegisterPage() {
  const [isShaking, setIsShaking] = useState(false);
  const [isAngry, setIsAngry] = useState(false);
  const angryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [mode, setMode] = useState<Mode>("register");
  const current = MODES.find((item) => item.key === mode) ?? MODES[0];

  function shakeCard() {
    setIsShaking(false);
    setTimeout(() => setIsShaking(true), 10);

    // Мафиози за карточкой злится чуть дольше, чем трясётся карточка
    setIsAngry(true);
    if (angryTimer.current) clearTimeout(angryTimer.current);
    angryTimer.current = setTimeout(() => setIsAngry(false), 1600);
  }

  return (
    <div className="register-page">
      <BloodBackground />

      <main className="register-page-center">
        {/* Карточка оформлена как карта из колоды — та же рамка и индексы, что у карт ролей */}
        <section
          className={isShaking ? "register-card register-card-shake" : "register-card"}
          aria-labelledby="register-title"
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget) setIsShaking(false);
          }}
        >
          <PeekingEyes isAngry={isAngry} />
          <CardIndex position="top" />
          <CardIndex position="bottom" />

          <Image className="register-logo" src="/img/logo.webp" alt="Mafia Community" width={96} height={96} priority />

          <h1 id="register-title" className="sr-only">
            {current.title}
          </h1>

          <div className="register-tabs" role="tablist" aria-label="Регистрация или вход">
            {MODES.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={mode === item.key}
                className={mode === item.key ? "register-tab register-tab-active" : "register-tab"}
                onClick={() => setMode(item.key)}
              >
                {item.title}
              </button>
            ))}
          </div>

          <p className="register-subtitle">{current.subtitle}</p>

          <RegisterForm mode={mode} onError={shakeCard} />
        </section>
      </main>
    </div>
  );
}
