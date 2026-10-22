import type { Metadata } from "next";

import ShopPage from "@/components/pages/shop/ShopPage";

export const metadata: Metadata = { title: "Магазин — Mafia" };

export default function Page() {
  return <ShopPage />;
}
