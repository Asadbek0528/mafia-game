/*
  Адрес "/roles" — описание ролей.
*/
import type { Metadata } from "next";

import RolesPage from "@/components/pages/roles/RolesPage";

export const metadata: Metadata = { title: "Роли — Mafia" };

export default function Page() {
  return <RolesPage />;
}
