import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { showToast } from "@/utils/toast";
import { api } from "@/utils/api";
import { saveLogin, takePageAfterLogin } from "@/utils/auth";

export function useGoogleCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const state = searchParams.get("state");

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
      .finishGoogleLogin(code, state)
      .then((result) => {
        if (!result.accessToken) throw new Error("Сервер не выдал токен.");
        saveLogin({ id: result.userId ?? undefined, username: result.username ?? "Игрок" }, result.accessToken, result.refreshToken);
        showToast("Вы вошли через Google.", "success");
        router.replace(takePageAfterLogin());
      })
      .catch((reason: Error) => setError(reason.message));
  }, [code, state, router]);

  return error;
}
