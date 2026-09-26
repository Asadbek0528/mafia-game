"use client";

/*
  RegisterPage — страница регистрации (шаг 1).
  Состоит из: страшный фон + карточка с логотипом и формой.
*/
import Image from "next/image";
import { useState } from "react";

import BloodBackground from "./blood-background/BloodBackground";
import RegisterForm from "./register-form/RegisterForm";
import "./register-page.scss";

export default function RegisterPage() {
  // когда true — карточка трясётся (ошибка в форме)
  const [isShaking, setIsShaking] = useState(false);

  // "register" — регистрация, "login" — вход в существующий аккаунт
  const [mode, setMode] = useState<"register" | "login">("register");

  function shakeCard() {
    setIsShaking(false);
    // маленькая пауза, чтобы анимация запустилась заново
    setTimeout(() => setIsShaking(true), 10);
  }

  return (
    <div className="register-page">
      <BloodBackground />

      <main className="register-page-center">
        <section
          className={isShaking ? "register-card register-card-shake" : "register-card"}
          onAnimationEnd={(event) => {
            // реагируем только на анимацию самой карточки
            if (event.target === event.currentTarget) setIsShaking(false);
          }}
        >
          <Image className="register-logo" src="/img/logo.webp" alt="Mafia Community" width={96} height={96} priority />

          <h1 className="register-title">{mode === "register" ? "Регистрация" : "Вход"}</h1>
          <p className="register-subtitle">
            {mode === "register" ? "Создай аккаунт, пока город спит." : "Город ждал тебя."}
          </p>

          <RegisterForm mode={mode} onModeChange={setMode} onError={shakeCard} />
        </section>
      </main>
    </div>
  );
}
