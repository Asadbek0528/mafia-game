import { useRouter } from "next/navigation";
import { type FormEvent, type MouseEvent, useEffect, useState } from "react";

import { showToast } from "@/utils/toast";
import { api, type LoginResult } from "@/utils/api";
import { loginAsGuest, saveLogin, takePageAfterLogin } from "@/utils/auth";

import type { RegisterMode } from "./register-page";

type FormErrors = {
  username: string;
  email: string;
  age: string;
  password: string;
};

const NO_ERRORS: FormErrors = { username: "", email: "", age: "", password: "" };

type FormValues = {
  username: string;
  email: string;
  age: string;
  password: string;
};

function validate(mode: RegisterMode, values: FormValues): FormErrors {
  const errors = { ...NO_ERRORS };
  const { username, email, age, password } = values;

  if (!username) errors.username = "Введите имя игрока.";
  else if (username.length < 3) errors.username = "Имя — минимум 3 символа.";
  else if (!/^[a-zA-Z0-9_а-яА-ЯёЁ]+$/.test(username))
    errors.username = "Только буквы, цифры и _.";

  if (!password) errors.password = "Введите пароль.";
  else if (password.length < 6)
    errors.password = "Пароль — минимум 6 символов.";

  if (mode === "register") {
    if (!email) errors.email = "Введите email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.email = "Email выглядит неправильно.";

    const ageNumber = Number(age);
    if (!age) errors.age = "Введите возраст.";
    else if (!Number.isInteger(ageNumber) || ageNumber < 6 || ageNumber > 100)
      errors.age = "Возраст — число от 6 до 100.";
  }

  return errors;
}

function passwordStrength(password: string): { level: 0 | 1 | 2 | 3; text: string } {
  if (!password) return { level: 0, text: "" };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[a-zа-яё]/.test(password) && /[A-ZА-ЯЁ]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9а-яА-ЯёЁ]/.test(password)) score += 1;
  if (password.length < 6 || score <= 1) return { level: 1, text: "Слабый пароль" };
  if (score <= 3) return { level: 2, text: "Нормальный пароль" };
  return { level: 3, text: "Надёжный пароль" };
}

export function useRegisterForm(mode: RegisterMode, onError: () => void) {
  const router = useRouter();

  const [values, setValues] = useState<FormValues>({
    username: "",
    email: "",
    age: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>(NO_ERRORS);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setErrors(NO_ERRORS);
  }, [mode]);

  const strength = mode === "register" ? passwordStrength(values.password) : null;

  function setField(name: keyof FormValues, value: string) {
    setValues({ ...values, [name]: value });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const clean = {
      ...values,
      username: values.username.trim(),
      email: values.email.trim(),
    };

    const newErrors = validate(mode, clean);
    setErrors(newErrors);
    if (Object.values(newErrors).some((error) => error !== "")) {
      onError();
      return;
    }

    setIsLoading(true);
    try {
      let result: LoginResult;

      if (mode === "register") {
        result = await api.register(
          clean.username,
          clean.email,
          Number(clean.age),
          clean.password,
        );

        if (!result.accessToken) {
          result = await api.login(clean.username, clean.password);
        }
      } else {
        result = await api.login(clean.username, clean.password);
      }

      saveLogin(
        {
          id: result.userId ?? undefined,
          username: clean.username,
          email: clean.email || undefined,
          age: clean.age ? Number(clean.age) : undefined,
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
      router.push(takePageAfterLogin());
    } catch (error) {
      showToast((error as Error).message, "error");
      onError();
    } finally {
      setIsLoading(false);
    }
  }

  function inputClass(name: keyof FormErrors) {
    return errors[name]
      ? "input register-input input-error"
      : "input register-input";
  }

  function playAsGuest(event: MouseEvent) {
    event.preventDefault();
    loginAsGuest();
    router.push(takePageAfterLogin());
  }

  return {
    values,
    errors,
    strength,
    isLoading,
    showPassword,
    togglePassword: () => setShowPassword((old) => !old),
    setField,
    inputClass,
    handleSubmit,
    playAsGuest,
    startGoogleLogin: () => api.startGoogleLogin(),
  };
}
