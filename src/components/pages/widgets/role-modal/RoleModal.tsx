"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

import type { Role } from "@/lib/roles";
import "./role-modal.scss";

type RoleModalProps = {
  role: Role | null;
  onClose: () => void;
};

export default function RoleModal({ role, onClose }: RoleModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (role && !dialog.open) dialog.showModal();
    if (!role && dialog.open) dialog.close();
  }, [role]);

  return (
    <dialog
      ref={dialogRef}
      className="role-modal"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-labelledby="role-modal-title"
    >
      {role && (
        <div className="role-modal-body">
          <button type="button" className="role-modal-close" onClick={onClose} aria-label="Закрыть">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>

          <div className="role-modal-card">
            <Image src={role.image} alt={role.name} width={600} height={900} priority />
          </div>

          <div className="role-modal-content">
            <p className={role.team === "mafia" ? "role-modal-team role-modal-team-mafia" : "role-modal-team"}>
              {role.team === "mafia" ? "Команда мафии" : "Команда города"}
            </p>
            <h2 id="role-modal-title" className="role-modal-title">
              {role.name}
            </h2>
            <p className="role-modal-tagline">{role.tagline}</p>

            <p className="role-modal-story">{role.story}</p>

            <h3 className="role-modal-heading">Что умеет</h3>
            <ul className="role-modal-list">
              {role.abilities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <h3 className="role-modal-heading">Как победить</h3>
            <p className="role-modal-goal">{role.goal}</p>

            <h3 className="role-modal-heading">Советы</h3>
            <ul className="role-modal-list role-modal-tips">
              {role.tips.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </dialog>
  );
}
