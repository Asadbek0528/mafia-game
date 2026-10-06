"use client";

import { useEffect, useRef, useState } from "react";

import Avatar from "@/components/pages/widgets/avatar/Avatar";
import { showToast } from "@/components/pages/widgets/toast/Toast";
import { resizeImage } from "@/lib/image";
import "./avatar-picker.scss";

const MAX_FILE_MB = 5;

type AvatarPickerProps = {
  name: string;
  image: string | null | undefined;
  size: number;
  onPick: (image: string) => Promise<void>;
  pasteAnywhere?: boolean;
};

function findImage(files: FileList | null | undefined): File | null {
  return (
    Array.from(files ?? []).find((file) => file.type.startsWith("image/")) ??
    null
  );
}

export default function AvatarPicker({
  name,
  image,
  size,
  onPick,
  pasteAnywhere = false,
}: AvatarPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOver, setIsOver] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function applyFile(file: File | null) {
    if (isSaving) return;
    if (!file) {
      showToast("Это не картинка. Выберите JPG, PNG или WEBP.", "error");
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      showToast(`Файл больше ${MAX_FILE_MB} МБ. Выберите поменьше.`, "error");
      return;
    }

    setIsSaving(true);
    try {
      await onPick(await resizeImage(file));
      showToast("Фото профиля обновлено.", "success");
    } catch (error) {
      showToast((error as Error).message, "error");
    } finally {
      setIsSaving(false);
    }
  }

  const applyRef = useRef(applyFile);
  useEffect(() => {
    applyRef.current = applyFile;
  });

  useEffect(() => {
    if (!pasteAnywhere) return;
    function handlePaste(event: ClipboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable='true']")) return;
      const file = findImage(event.clipboardData?.files);
      if (!file) return;
      event.preventDefault();
      applyRef.current(file);
    }
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [pasteAnywhere]);

  let className = "avatar-picker";
  if (isOver) className += " avatar-picker-over";
  if (isSaving) className += " avatar-picker-saving";

  return (
    <>
      <button
        type="button"
        className={className}
        style={{ width: size, height: size }}
        title="Нажмите, перетащите или вставьте (Ctrl+V) фото"
        aria-label="Сменить фото профиля"
        disabled={isSaving}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsOver(true);
        }}
        onDragLeave={() => setIsOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsOver(false);
          applyFile(findImage(event.dataTransfer.files));
        }}
        onPaste={(event) => {
          if (pasteAnywhere) return;
          const file = findImage(event.clipboardData.files);
          if (!file) return;
          event.preventDefault();
          applyFile(file);
        }}
      >
        <Avatar name={name} image={image} size={size} />
        <span className="avatar-picker-overlay" aria-hidden="true">
          {isSaving ? (
            <span className="avatar-picker-spinner" />
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
          )}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          event.target.value = "";
          if (file) applyFile(file.type.startsWith("image/") ? file : null);
        }}
      />
    </>
  );
}
