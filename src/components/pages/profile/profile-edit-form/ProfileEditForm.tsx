"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AvatarPicker from "@/components/pages/widgets/avatar-picker/AvatarPicker";
import { showToast } from "@/components/pages/widgets/toast/Toast";
import { api } from "@/lib/api";
import { getRefreshToken, getToken, saveLogin, useCurrentUser } from "@/lib/auth";
import "./profile-edit-form.scss";

const MAX_FILE_MB = 5;

type FormValues = {
  username: string;
  email: string;
};

type FormErrors = Record<keyof FormValues, string>;

const EMPTY: FormValues = { username: "", email: "" };
const NO_ERRORS: FormErrors = { username: "", email: "" };

function validate(values: FormValues): FormErrors {
  const errors = { ...NO_ERRORS };

  if (!values.username) errors.username = "Введите имя игрока.";
  else if (values.username.length < 3) errors.username = "Имя — минимум 3 символа.";
  else if (!/^[a-zA-Z0-9_а-яА-ЯёЁ]+$/.test(values.username)) errors.username = "Только буквы, цифры и _.";

  if (!values.email) errors.email = "Введите email.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = "Email выглядит неправильно.";

  return errors;
}

type ProfileEditFormProps = {
  onSaved: () => void;
};

export default function ProfileEditForm({ onSaved }: ProfileEditFormProps) {
  const { user } = useCurrentUser();

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

  async function savePhoto(image: string | null) {
    await api.updatePhoto(image);
    setPhoto(image);
    if (user) saveLogin({ ...user, profile_image: image }, getToken(), getRefreshToken());
  }

  async function removePhoto() {
    try {
      await savePhoto(null);
      showToast("Фото убрано.", "success");
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
      await api.updateProfile({
        username: clean.username,
        email: clean.email,
        profileImage: photo,
      });

      saveLogin({ ...user, username: clean.username, email: clean.email, profile_image: photo }, getToken(), getRefreshToken());

      setValues(clean);
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
          <AvatarPicker name={values.username || "?"} image={photo} size={96} onPick={savePhoto} pasteAnywhere />

          <div className="profile-edit-photo-buttons">
            <p className="profile-edit-photo-title">Нажмите на фото, перетащите картинку или вставьте её (Ctrl+V)</p>
            <p className="profile-edit-hint">JPG, PNG или WEBP, до {MAX_FILE_MB} МБ — сохраняется сразу</p>
            {photo && (
              <button type="button" className="btn-link" onClick={removePhoto}>
                Убрать фото
              </button>
            )}
          </div>
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

        <div className="profile-edit-confirm">
          <button type="submit" className="btn btn-red profile-edit-save" disabled={isSaving}>
            {isSaving ? "Сохраняем…" : "Сохранить"}
          </button>
        </div>
      </form>
    </section>
  );
}
