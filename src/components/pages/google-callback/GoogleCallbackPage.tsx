"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { showToast } from "@/components/pages/widgets/toast/Toast";
import { api } from "@/lib/api";
import { saveLogin } from "@/lib/auth";
import "./google-callback.scss";

export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  const [error, setError] = useState("");
  const isStarted = useRef(false);

  useEffect(() => {
    if (isStarted.current) return;
    isStarted.current = true;

    if (!code) {
      setError("Google не вернул код входа. Попробуйте ещё раз.");
      return;
    }

    api
      .finishGoogleLogin(code)
      .then((result) => {
        if (!result.accessToken) throw new Error("Сервер не выдал токен.");

        saveLogin(
          { id: result.userId ?? undefined, username: result.username ?? "Игрок" },
          result.accessToken,
          result.refreshToken,
        );
        showToast("Вы вошли через Google.", "success");
        router.replace("/");
      })
      .catch((reason: Error) => setError(reason.message));
  }, [code, router]);

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
