import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";

import { showToast } from "@/utils/toast";
import { api } from "@/utils/api";
import { getRefreshToken, getToken, saveLogin, useCurrentUser } from "@/utils/auth";
import { resizeImage } from "@/utils/image";

export const MAX_FILE_MB = 5;

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

export function useProfileEditForm(onSaved: () => void) {
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
      .catch(() => {});
  }, [user]);

  function setField(name: keyof FormValues, value: string) {
    setValues({ ...values, [name]: value });
  }

  async function savePhoto(image: string | null) {
    await api.updatePhoto(image);
    setPhoto(image);
    if (user) saveLogin({ ...user, profile_image: image }, getToken(), getRefreshToken());
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
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
      await savePhoto(await resizeImage(file));
      showToast("Фото профиля обновлено.", "success");
    } catch (error) {
      showToast((error as Error).message, "error");
    }
  }

  async function removePhoto() {
    try {
      await savePhoto(null);
      showToast("Фото убрано.", "success");
    } catch (error) {
      showToast((error as Error).message, "error");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const clean = { ...values, username: values.username.trim(), email: values.email.trim() };

    const newErrors = validate(clean);
    setErrors(newErrors);
    if (Object.values(newErrors).some((error) => error !== "")) return;

    setIsSaving(true);
    try {
      await api.updateProfile({ username: clean.username, email: clean.email, profileImage: photo });
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

  return {
    isGuest: user?.guest === true,
    fileInputRef,
    values,
    photo,
    errors,
    isSaving,
    setField,
    savePhoto,
    handlePhotoChange,
    removePhoto,
    handleSubmit,
    pickFile: () => fileInputRef.current?.click(),
    inputClass: (name: keyof FormValues) => (errors[name] ? "input input-error" : "input"),
  };
}
