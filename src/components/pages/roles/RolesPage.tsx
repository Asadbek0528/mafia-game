/*
  RolesPage — страница «Роли», адрес "/roles".
  Карточка роли + короткое объяснение, что она делает.
*/
import Image from "next/image";

import { ROLES } from "@/lib/roles";
import "./roles-page.scss";

export default function RolesPage() {
  return (
    <main className="roles-page">
      <h1 className="roles-page-title">Роли</h1>
      <p className="roles-page-subtitle">Роль выдаётся случайно в начале игры. Никому её не показывай.</p>

      <ul className="roles-page-list">
        {ROLES.map((role) => (
          <li key={role.key} className="roles-page-item">
            <Image className="roles-page-image" src={role.image} alt={role.name} width={600} height={900} />
            <p className="roles-page-about">{role.about}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
