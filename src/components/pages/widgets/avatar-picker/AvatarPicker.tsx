"use client";


import Avatar from "@/components/pages/widgets/avatar/Avatar";
import { useAvatarPicker } from "@/utils/widgets/avatar-picker";
import "./avatar-picker.scss";

type AvatarPickerProps = {
  name: string;
  image: string | null | undefined;
  size: number;
  onPick: (image: string) => Promise<void>;
  pasteAnywhere?: boolean;
};

export default function AvatarPicker({
  name,
  image,
  size,
  onPick,
  pasteAnywhere = false,
}: AvatarPickerProps) {
  const { inputRef, className, isSaving, openFile, onDragOver, onDragLeave, onDrop, onPaste, onFileChange } = useAvatarPicker(onPick, pasteAnywhere);

  return (
    <>
      <button
        type="button"
        className={className}
        style={{ width: size, height: size }}
        title="Нажмите, перетащите или вставьте (Ctrl+V) фото"
        aria-label="Сменить фото профиля"
        disabled={isSaving}
        onClick={openFile}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onPaste={onPaste}
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
        onChange={onFileChange}
      />
    </>
  );
}
