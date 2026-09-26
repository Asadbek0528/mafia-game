"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import Avatar from "@/components/pages/widgets/avatar/Avatar";
import { showToast } from "@/components/pages/widgets/toast/Toast";
import { api } from "@/lib/api";
import { getRefreshToken, getToken, saveLogin, useCurrentUser } from "@/lib/auth";
import { resizeImage } from "@/lib/image";
import "./profile-edit-form.scss";

const MAX_FILE_MB = 5;

type FormValues = {
  username: string;
  email: string;
  newPassword: string;
  repeatPassword: string;
  currentPassword: string;
};

type FormErrors = Record<keyof FormValues, string>;

const EMPTY: FormValues = { username: "", email: "", newPassword: "", repeatPassword: "", currentPassword: "" };
const NO_ERRORS: FormErrors = { username: "", email: "", newPassword: "", repeatPassword: "", currentPassword: "" };

function validate(values: FormValues): FormErrors {
  const errors = { ...NO_ERRORS };

  if (!values.username) errors.username = "Введите имя игрока.";
  else if (values.username.length < 3) errors.username = "Имя — минимум 3 символа.";
  else if (!/^[a-zA-Z0-9_а-яА-ЯёЁ]+$/.test(values.username)) errors.username = "Только буквы, цифры и _.";

  if (!values.email) errors.email = "Введите email.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = "Email выглядит неправильно.";

  if (values.newPassword && values.newPassword.length < 6) errors.newPassword = "Пароль — минимум 6 символов.";
  if (values.newPassword && values.repeatPassword !== values.newPassword) errors.repeatPassword = "Пароли не совпадают.";

  if (!values.currentPassword) errors.currentPassword = "Введите текущий пароль, чтобы сохранить.";

  return errors;
}

type ProfileEditFormProps = {
  onSaved: () => void;
};

export default function ProfileEditForm({ onSaved }: ProfileEditFormProps) {
  const { user } = useCurrentUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [values, setValues] = useState<FormValues>(EMPTY);
  const [photo, setPhoto] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>(NO_ERRORS);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user || user.guest) return;

    setValues((old) => ({ ...old, username: user.username, email: user.email ?? "" }));
    setPhoto(user.profile_image ?? null);

    api
      .getMe()
      .then((fresh) => {
        setValues((old) => ({ ...old, username: fresh.username, email: fresh.email ?? "" }));
        setPhoto(fresh.profile_image ?? null);
      })
      .catch(() => {
      });
  }, [user]);

  if (user?.guest) {
    return (
      <section className="panel profile-edit">
        <h2 className="panel-title">Редактировать профиль</h2>
        <p className="profile-edit-note">
          Гости не могут менять профиль. <Link href="/register">Создайте аккаунт</Link> — это займёт минуту.
        </p>
      </section>
    );
  }

  function setField(name: keyof FormValues, value: string) {
    setValues({ ...values, [name]: value });
  }

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Это не картинка. Выберите JPG, PNG или WEBP.", "error");
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      showToast(`Файл больше ${MAX_FILE_MB} МБ. Выберите поменьше.`, "error");
      return;
    }

    try {
      setPhoto(await resizeImage(file));
    } catch (error) {
      showToast((error as Error).message, "error");
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const clean = { ...values, username: values.username.trim(), email: values.email.trim() };

    const newErrors = validate(clean);
    setErrors(newErrors);
    if (Object.values(newErrors).some((error) => error !== "")) return;

    setIsSaving(true);
    try {
      const password = clean.newPassword || clean.currentPassword;

      await api.updateProfile({
        username: clean.username,
        email: clean.email,
        password,
        profileImage: photo,
      });

      saveLogin({ ...user, username: clean.username, email: clean.email, profile_image: photo }, getToken(), getRefreshToken());

      setValues({ ...clean, newPassword: "", repeatPassword: "", currentPassword: "" });
      showToast("Профиль сохранён.", "success");
      onSaved();
    } catch (error) {
      showToast((error as Error).message, "error");
    } finally {
      setIsSaving(false);
    }
  }

  function inputClass(name: keyof FormValues) {
    return errors[name] ? "input input-error" : "input";
  }

  return (
    <section className="panel profile-edit">
      <h2 className="panel-title">Редактировать профиль</h2>

      <form className="profile-edit-form" onSubmit={handleSubmit} noValidate>
        <div className="profile-edit-photo">
          <Avatar name={values.username || "?"} image={photo} size={96} />

          <div className="profile-edit-photo-buttons">
            <button type="button" className="btn btn-dark btn-small" onClick={() => fileInputRef.current?.click()}>
              Загрузить фото
            </button>
            {photo && (
              <button type="button" className="btn-link" onClick={() => setPhoto(null)}>
                Убрать фото
              </button>
            )}
            <p className="profile-edit-hint">JPG, PNG или WEBP, до {MAX_FILE_MB} МБ</p>
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handlePhotoChange} />
        </div>

        <div className="profile-edit-row">
          <label className="profile-edit-field">
            <span className="profile-edit-label">Имя игрока</span>
            <input
              className={inputClass("username")}
              maxLength={20}
              autoComplete="username"
              value={values.username}
              onChange={(event) => setField("username", event.target.value)}
            />
            {errors.username && <span className="profile-edit-error">{errors.username}</span>}
          </label>

          <label className="profile-edit-field">
            <span className="profile-edit-label">Email</span>
            <input
              className={inputClass("email")}
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={(event) => setField("email", event.target.value)}
            />
            {errors.email && <span className="profile-edit-error">{errors.email}</span>}
          </label>
        </div>

        <p className="profile-edit-section">Сменить пароль (необязательно)</p>
        <div className="profile-edit-row">
          <label className="profile-edit-field">
            <span className="profile-edit-label">Новый пароль</span>
            <input
              className={inputClass("newPassword")}
              type="password"
              autoComplete="new-password"
              placeholder="минимум 6 символов"
              value={values.newPassword}
              onChange={(event) => setField("newPassword", event.target.value)}
            />
            {errors.newPassword && <span className="profile-edit-error">{errors.newPassword}</span>}
          </label>

          <label className="profile-edit-field">
            <span className="profile-edit-label">Повторите новый пароль</span>
            <input
              className={inputClass("repeatPassword")}
              type="password"
              autoComplete="new-password"
              value={values.repeatPassword}
              onChange={(event) => setField("repeatPassword", event.target.value)}
            />
            {errors.repeatPassword && <span className="profile-edit-error">{errors.repeatPassword}</span>}
          </label>
        </div>

        <div className="profile-edit-confirm">
          <label className="profile-edit-field">
            <span className="profile-edit-label">Текущий пароль — чтобы сохранить изменения</span>
            <input
              className={inputClass("currentPassword")}
              type="password"
              autoComplete="current-password"
              value={values.currentPassword}
              onChange={(event) => setField("currentPassword", event.target.value)}
            />
            {errors.currentPassword && <span className="profile-edit-error">{errors.currentPassword}</span>}
          </label>

          <button type="submit" className="btn btn-red profile-edit-save" disabled={isSaving}>
            {isSaving ? "Сохраняем…" : "Сохранить"}
          </button>
        </div>
      </form>
    </section>
  );
}
