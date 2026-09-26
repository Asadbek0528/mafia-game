/*
  RoleCards — 4 карточки ролей (только картинки).
  Используется на главной странице и на странице /roles.
*/
import Image from "next/image";

import { ROLES } from "@/lib/roles";
import "./role-cards.scss";

export default function RoleCards() {
  return (
    <div className="role-cards">
      {ROLES.map((role) => (
        <figure key={role.key} className="role-card">
          <Image src={role.image} alt={role.name} width={600} height={900} />
        </figure>
      ))}
    </div>
  );
}
