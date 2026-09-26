import type { Metadata } from "next";
import { Suspense } from "react";

import GoogleCallbackPage from "@/components/pages/google-callback/GoogleCallbackPage";

export const metadata: Metadata = { title: "Вход — Mafia" };

export default function Page() {
  return (
    <Suspense>
      <GoogleCallbackPage />
    </Suspense>
  );
}
