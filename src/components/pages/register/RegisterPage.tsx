"use client";

import Image from "next/image";

import { REGISTER_MODES, useRegisterPage } from "@/utils/register/register-page";

import BloodBackground from "./blood-background/BloodBackground";
import PeekingEyes from "./peeking-eyes/PeekingEyes";
import RegisterForm from "./register-form/RegisterForm";
import "./register-page.scss";

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
  const { mode, setMode, current, isShaking, isAngry, shakeCard, handleAnimationEnd } = useRegisterPage();

  return (
    <div className="register-page">
      <BloodBackground />

      <main className="register-page-center">
        <section
          className={isShaking ? "register-card register-card-shake" : "register-card"}
          aria-labelledby="register-title"
          onAnimationEnd={handleAnimationEnd}
        >
          <PeekingEyes isAngry={isAngry} />
          <CardIndex position="top" />
          <CardIndex position="bottom" />

          <Image className="register-logo" src="/img/logo.webp" alt="Mafia Community" width={96} height={96} priority />

          <h1 id="register-title" className="sr-only">
            {current.title}
          </h1>

          <div className="register-tabs" role="tablist" aria-label="Регистрация или вход">
            {REGISTER_MODES.map((item) => (
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
