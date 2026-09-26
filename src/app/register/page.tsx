import type { Metadata } from "next";

import RegisterPage from "@/components/pages/register/RegisterPage";

export const metadata: Metadata = { title: "Регистрация — Mafia" };

export default function Page() {
  return <RegisterPage />;
}
