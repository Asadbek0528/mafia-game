import { type ChangeEvent, type ClipboardEvent as ReactClipboardEvent, type DragEvent, useEffect, useRef, useState } from "react";

import { resizeImage } from "@/utils/image";
import { showToast } from "@/utils/toast";

const MAX_FILE_MB = 5;

function findImage(files: FileList | null | undefined): File | null {
  return Array.from(files ?? []).find((file) => file.type.startsWith("image/")) ?? null;
}

export function useAvatarPicker(onPick: (image: string) => Promise<void>, pasteAnywhere: boolean) {
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

  return {
    inputRef,
    className,
    isSaving,
    openFile: () => inputRef.current?.click(),
    onDragOver: (event: DragEvent) => {
      event.preventDefault();
      setIsOver(true);
    },
    onDragLeave: () => setIsOver(false),
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      setIsOver(false);
      applyFile(findImage(event.dataTransfer.files));
    },
    onPaste: (event: ReactClipboardEvent) => {
      if (pasteAnywhere) return;
      const file = findImage(event.clipboardData.files);
      if (!file) return;
      event.preventDefault();
      applyFile(file);
    },
    onFileChange: (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      event.target.value = "";
      if (file) applyFile(file.type.startsWith("image/") ? file : null);
    },
  };
}
