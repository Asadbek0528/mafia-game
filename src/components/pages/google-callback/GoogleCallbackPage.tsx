"use client";

import Link from "next/link";

import { useGoogleCallback } from "@/utils/google-callback";
import "./google-callback.scss";

export default function GoogleCallbackPage() {
  const error = useGoogleCallback();

  return (
    <main className="google-callback">
      {error ? (
        <>
          <p className="google-callback-error">{error}</p>
          <Link href="/register" className="btn btn-red">
            Назад ко входу
          </Link>
        </>
      ) : (
        <p className="google-callback-text">Входим через Google…</p>
      )}
    </main>
  );
}
