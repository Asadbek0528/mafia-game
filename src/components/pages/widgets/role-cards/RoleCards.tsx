"use client";

import Image from "next/image";

import RoleModal from "@/components/pages/widgets/role-modal/RoleModal";
import { ROLES } from "@/utils/roles";
import { useRoleCards } from "@/utils/widgets/role-modal";
import "./role-cards.scss";

export default function RoleCards() {
  const { openRole, setOpenRole, close } = useRoleCards();

  return (
    <>
      <div className="role-cards">
        {ROLES.map((role) => (
          <button
            key={role.key}
            type="button"
            className="role-card"
            onClick={() => setOpenRole(role)}
            aria-label={`${role.name} — подробнее`}
          >
            <Image src={role.image} alt={role.name} width={600} height={900} />
            <span className="role-card-more">Подробнее</span>
          </button>
        ))}
      </div>

      <RoleModal role={openRole} onClose={close} />
    </>
  );
}
