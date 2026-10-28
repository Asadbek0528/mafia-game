import { type AnimationEvent, useRef, useState } from "react";

export type RegisterMode = "register" | "login";

export const REGISTER_MODES: { key: RegisterMode; title: string; subtitle: string }[] = [
  { key: "register", title: "Регистрация", subtitle: "Создай аккаунт, пока город спит." },
  { key: "login", title: "Вход", subtitle: "Город ждал тебя." },
];

const ANGRY_MS = 1600;

export function useRegisterPage() {
  const [isShaking, setIsShaking] = useState(false);
  const [isAngry, setIsAngry] = useState(false);
  const angryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mode, setMode] = useState<RegisterMode>("register");

  function shakeCard() {
    setIsShaking(false);
    setTimeout(() => setIsShaking(true), 10);
    setIsAngry(true);
    if (angryTimer.current) clearTimeout(angryTimer.current);
    angryTimer.current = setTimeout(() => setIsAngry(false), ANGRY_MS);
  }

  return {
    mode,
    setMode,
    current: REGISTER_MODES.find((item) => item.key === mode) ?? REGISTER_MODES[0],
    isShaking,
    isAngry,
    shakeCard,
    handleAnimationEnd: (event: AnimationEvent<HTMLElement>) => {
      if (event.target === event.currentTarget) setIsShaking(false);
    },
  };
}
