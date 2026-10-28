"use client";

import Link from "next/link";

import AvatarPicker from "@/components/pages/widgets/avatar-picker/AvatarPicker";
import { MAX_FILE_MB, useProfileEditForm } from "@/utils/profile/profile-edit-form";
import "./profile-edit-form.scss";

type ProfileEditFormProps = {
  onSaved: () => void;
};

export default function ProfileEditForm({ onSaved }: ProfileEditFormProps) {
  const { isGuest, fileInputRef, values, photo, errors, isSaving, setField, savePhoto, handlePhotoChange, removePhoto, handleSubmit, pickFile, inputClass } = useProfileEditForm(onSaved);

  if (isGuest) {
    return (
      <section className="panel profile-edit">
        <h2 className="panel-title">Редактировать профиль</h2>
        <p className="profile-edit-note">
          Гости не могут менять профиль. <Link href="/register">Создайте аккаунт</Link> — это займёт минуту.
        </p>
      </section>
    );
  }

  return (
    <section className="panel profile-edit">
      <h2 className="panel-title">Редактировать профиль</h2>

      <form className="profile-edit-form" onSubmit={handleSubmit} noValidate>
        <div className="profile-edit-photo">
          <AvatarPicker name={values.username || "?"} image={photo} size={96} onPick={savePhoto} pasteAnywhere />

          <div className="profile-edit-photo-buttons">
            <button type="button" className="btn btn-dark btn-small" onClick={pickFile}>
              Загрузить фото
            </button>
            {photo && (
              <button type="button" className="btn-link" onClick={removePhoto}>
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

        <div className="profile-edit-confirm">
          <button type="submit" className="btn btn-red profile-edit-save" disabled={isSaving}>
            {isSaving ? "Сохраняем…" : "Сохранить"}
          </button>
        </div>
      </form>
    </section>
  );
}
