"use client";

import Link from "next/link";

import type { RegisterMode } from "@/utils/register/register-page";
import { useRegisterForm } from "@/utils/register/register-form";
import "./register-form.scss";

type RegisterFormProps = {
  mode: RegisterMode;
  onError: () => void;
};

export default function RegisterForm({ mode, onError }: RegisterFormProps) {
  const { values, errors, strength, isLoading, showPassword, togglePassword, setField, inputClass, handleSubmit, playAsGuest, startGoogleLogin } = useRegisterForm(mode, onError);

  return (
    <>
      <form className="register-form" onSubmit={handleSubmit} noValidate>
        <div className="register-field">
          <label htmlFor="username" className="register-label">
            Имя игрока
          </label>
          <div className="register-input-box">
            <svg
              className="register-input-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
            </svg>
            <input
              id="username"
              className={inputClass("username")}
              aria-invalid={Boolean(errors.username)}
              aria-describedby={errors.username ? "username-error" : undefined}
              type="text"
              autoComplete="username"
              placeholder="например, darkness"
              maxLength={20}
              value={values.username}
              onChange={(event) => setField("username", event.target.value)}
            />
          </div>
          {errors.username && (
            <p id="username-error" className="register-error" role="alert">{errors.username}</p>
          )}
        </div>

        {mode === "register" && (
          <div className="register-field">
            <label htmlFor="email" className="register-label">
              Email
            </label>
            <div className="register-input-box">
              <svg
                className="register-input-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
              <input
                id="email"
                className={inputClass("email")}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
                type="email"
                autoComplete="email"
                placeholder="you@mail.com"
                value={values.email}
                onChange={(event) => setField("email", event.target.value)}
              />
            </div>
            {errors.email && <p id="email-error" className="register-error" role="alert">{errors.email}</p>}
          </div>
        )}

        {mode === "register" && (
          <div className="register-field">
            <label htmlFor="age" className="register-label">
              Возраст
            </label>
            <div className="register-input-box">
              <svg
                className="register-input-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M3 10h18M8 3v4M16 3v4" />
              </svg>
              <input
                id="age"
                className={inputClass("age")}
              aria-invalid={Boolean(errors.age)}
              aria-describedby={errors.age ? "age-error" : undefined}
                type="number"
                inputMode="numeric"
                min={6}
                max={100}
                placeholder="например, 18"
                value={values.age}
                onChange={(event) => setField("age", event.target.value)}
              />
            </div>
            {errors.age && <p id="age-error" className="register-error" role="alert">{errors.age}</p>}
          </div>
        )}

        <div className="register-field">
          <label htmlFor="password" className="register-label">
            Пароль
          </label>
          <div className="register-input-box">
            <svg
              className="register-input-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <rect x="4" y="10" width="16" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            <input
              id="password"
              className={inputClass("password")}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
              type={showPassword ? "text" : "password"}
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              placeholder={mode === "register" ? "минимум 6 символов" : "ваш пароль"}
              value={values.password}
              onChange={(event) => setField("password", event.target.value)}
            />
            <button
              type="button"
              className="register-eye"
              onClick={togglePassword}
              aria-label="Показать пароль"
              title={showPassword ? "Скрыть пароль" : "Показать пароль"}
              aria-pressed={showPassword}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
                {showPassword && <path d="M4 4l16 16" />}
              </svg>
            </button>
          </div>
          {errors.password && (
            <p id="password-error" className="register-error" role="alert">{errors.password}</p>
          )}
          {!errors.password && strength && strength.level > 0 && (
            <p className={`register-strength register-strength-${strength.level}`} aria-live="polite">
              <span className="register-strength-bar" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              {strength.text}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-red btn-full register-submit"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="register-spinner" />
          ) : mode === "register" ? (
            "Создать аккаунт"
          ) : (
            "Войти"
          )}
        </button>

        <div className="register-or">или</div>

        <button type="button" className="btn btn-dark btn-full" onClick={startGoogleLogin}>
          <svg viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12Z"
            />
          </svg>
          Войти через Google
        </button>
      </form>

      <div className="register-guest">
        <Link
          href="/"
          onClick={playAsGuest}
          className="register-guest-button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 9.5c3-1.3 6-1.1 9 .8 3-1.9 6-2.1 9-.8-.4 3.9-2.4 5.9-5 5.9-1.6 0-2.8-1-4-2.4-1.2 1.4-2.4 2.4-4 2.4-2.6 0-4.6-2-5-5.9Z" />
            <circle cx="8" cy="11.2" r="1.1" />
            <circle cx="16" cy="11.2" r="1.1" />
          </svg>
          Играть как гость
        </Link>
        <p className="register-guest-hint">Без аккаунта не сохранятся статистика, друзья и покупки.</p>
      </div>
    </>
  );
}
