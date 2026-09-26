/*
  =============================================================
  auth.ts — кто сейчас играет (аккаунт или гость).
  Всё хранится в localStorage браузера:
    mafia_token   — access-токен (короткий, для запросов)
    mafia_refresh — refresh-токен (чтобы получить новый access)
    mafia_user    — данные игрока { id, username, ... }
  =============================================================
*/
import { useEffect, useState } from "react";
import type { User } from "./api";

const TOKEN_KEY = "mafia_token";
const REFRESH_KEY = "mafia_refresh";
const USER_KEY = "mafia_user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;

  const saved = localStorage.getItem(USER_KEY);
  if (!saved) return null;

  try {
    return JSON.parse(saved) as User;
  } catch {
    return null;
  }
}

// сохранить токены (после входа или обновления токена)
export function saveTokens(accessToken: string | null, refreshToken: string | null) {
  if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
  else localStorage.removeItem(TOKEN_KEY);

  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  else localStorage.removeItem(REFRESH_KEY);
}

// сохранить вход: игрок + токены
export function saveLogin(user: User, accessToken: string | null, refreshToken: string | null = null) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  saveTokens(accessToken, refreshToken);
}

// войти как гость: имя вида "Гость_4821"
export function loginAsGuest() {
  const number = Math.floor(1000 + Math.random() * 9000);
  saveLogin({ username: `Гость_${number}`, guest: true }, null);
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

/*
  Хук для компонентов: const { user, isLoaded } = useCurrentUser();
  isLoaded = false, пока мы ещё не прочитали localStorage.
*/
export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setUser(getUser());
    setIsLoaded(true);
  }, []);

  return { user, isLoaded };
}
