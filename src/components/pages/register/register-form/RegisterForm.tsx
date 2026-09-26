"use client";

/*
  RegisterForm — форма регистрации и входа.

  Режим «Регистрация»: имя, email, пароль.
  Режим «Вход»:        имя и пароль.

  Порядок работы:
  1. Проверяем поля (validate).
  2. Регистрация → api.register(...), потом api.login(...) чтобы получить токен.
     Вход        → сразу api.login(...).
  3. Сохраняем вход и переходим на главную "/".
*/
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { showToast } from "@/components/pages/widgets/toast/Toast";
import { api, type LoginResult } from "@/lib/api";
import { loginAsGuest, saveLogin } from "@/lib/auth";
import "./register-form.scss";

type Mode = "register" | "login";

// ошибки для каждого поля ("" = ошибки нет)
type FormErrors = {
  username: string;
  email: string;
  password: string;
};

const NO_ERRORS: FormErrors = { username: "", email: "", password: "" };

type FormValues = {
  username: string;
  email: string;
  password: string;
};

// проверка полей
function validate(mode: Mode, values: FormValues): FormErrors {
  const errors = { ...NO_ERRORS };
  const { username, email, password } = values;

  if (!username) errors.username = "Введите имя игрока.";
  else if (username.length < 3) errors.username = "Имя — минимум 3 символа.";
  else if (!/^[a-zA-Z0-9_а-яА-ЯёЁ]+$/.test(username))
    errors.username = "Только буквы, цифры и _.";

  if (!password) errors.password = "Введите пароль.";
  else if (password.length < 6)
    errors.password = "Пароль — минимум 6 символов.";

  // email нужен только при регистрации
  if (mode === "register") {
    if (!email) errors.email = "Введите email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.email = "Email выглядит неправильно.";
  }

  return errors;
}

type RegisterFormProps = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  onError: () => void; // сообщить странице, что была ошибка (карточка трясётся)
};

export default function RegisterForm({
  mode,
  onModeChange,
  onError,
}: RegisterFormProps) {
  const router = useRouter();

  const [values, setValues] = useState<FormValues>({
    username: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>(NO_ERRORS);
  const [isLoading, setIsLoading] = useState(false);

  // изменить одно поле
  function setField(name: keyof FormValues, value: string) {
    setValues({ ...values, [name]: value });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault(); // чтобы страница не перезагрузилась

    const clean = {
      ...values,
      username: values.username.trim(),
      email: values.email.trim(),
    };

    // 1. проверка
    const newErrors = validate(mode, clean);
    setErrors(newErrors);
    if (Object.values(newErrors).some((error) => error !== "")) {
      onError();
      return;
    }

    // 2. отправка на сервер
    setIsLoading(true);
    try {
      let result: LoginResult;

      if (mode === "register") {
        result = await api.register(
          clean.username,
          clean.email,
          clean.password,
        );

        // если регистрация не вернула токен — входим
        if (!result.accessToken) {
          result = await api.login(clean.username, clean.password);
        }
      } else {
        result = await api.login(clean.username, clean.password);
      }

      // 3. сохраняем и идём на главную
      saveLogin(
        {
          id: result.userId ?? undefined,
          username: clean.username,
          email: clean.email || undefined,
        },
        result.accessToken,
        result.refreshToken,
      );

      showToast(
        mode === "register"
          ? "Аккаунт создан. Добро пожаловать в город."
          : "С возвращением.",
        "success",
      );
      router.push("/");
    } catch (error) {
      showToast((error as Error).message, "error");
      onError();
    } finally {
      setIsLoading(false);
    }
  }

  // класс для поля: красная рамка, если ошибка
  function inputClass(name: keyof FormErrors) {
    return errors[name]
      ? "input register-input input-error"
      : "input register-input";
  }

  return (
    <>
      <form className="register-form" onSubmit={handleSubmit} noValidate>
        {/* ---- Имя игрока ---- */}
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
              type="text"
              autoComplete="username"
              placeholder="например, darkness"
              maxLength={20}
              value={values.username}
              onChange={(event) => setField("username", event.target.value)}
            />
          </div>
          {errors.username && (
            <p className="register-error">{errors.username}</p>
          )}
        </div>

        {/* ---- Email (только регистрация) ---- */}
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
                type="email"
                autoComplete="email"
                placeholder="you@mail.com"
                value={values.email}
                onChange={(event) => setField("email", event.target.value)}
              />
            </div>
            {errors.email && <p className="register-error">{errors.email}</p>}
          </div>
        )}

        {/* ---- Пароль ---- */}
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
              type={showPassword ? "text" : "password"}
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              placeholder="минимум 6 символов"
              value={values.password}
              onChange={(event) => setField("password", event.target.value)}
            />
            {/* кнопка-глаз: показать / скрыть пароль */}
            <button
              type="button"
              className="register-eye"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
          {errors.password && (
            <p className="register-error">{errors.password}</p>
          )}
        </div>

        {/* ---- Кнопки ---- */}
        <button
          type="submit"
          className="btn btn-red btn-full register-submit"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="register-spinner" />
          ) : mode === "register" ? (
            "Зайти в игру"
          ) : (
            "Войти"
          )}
        </button>

        <div className="register-or">или</div>

        <button type="button" className="btn btn-dark btn-full" onClick={() => api.startGoogleLogin()}>
          <svg viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12Z"
            />
          </svg>
          Войти через Google
        </button>
      </form>

      {/* переключить регистрация ↔ вход */}
      <p className="register-switch">
        {mode === "register" ? "Уже есть аккаунт? " : "Нет аккаунта? "}
        <button
          type="button"
          className="register-switch-button"
          onClick={() => {
            setErrors(NO_ERRORS);
            onModeChange(mode === "register" ? "login" : "register");
          }}
        >
          {mode === "register" ? "Войти" : "Зарегистрироваться"}
        </button>
      </p>

      <p className="register-guest">
        Не хочешь регистрироваться?{" "}
        <Link
          href="/"
          onClick={() => loginAsGuest()}
          className="register-guest-link"
        >
          Зайти как гость
        </Link>
      </p>
    </>
  );
}
