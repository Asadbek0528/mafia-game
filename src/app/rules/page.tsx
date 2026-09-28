import type { Metadata } from "next";

import RulesPage from "@/components/pages/rules/RulesPage";

export const metadata: Metadata = { title: "Правила — Mafia" };

export default function Page() {
  return <RulesPage />;
}
