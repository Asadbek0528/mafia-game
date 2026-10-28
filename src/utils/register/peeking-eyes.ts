import { useEffect, useRef, useState } from "react";

export type EyesMood = "watch" | "closed" | "peek";

export function usePeekingEyes() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mood, setMood] = useState<EyesMood>("watch");

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let focusTarget: HTMLElement | null = null;
    let frame = 0;
    let pointer: { x: number; y: number } | null = null;

    function lookAt(x: number, y: number) {
      if (!root) return;
      const box = root.getBoundingClientRect();
      const dx = x - (box.left + box.width / 2);
      const dy = y - (box.top + box.height * 0.6);
      const length = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, length / 220);
      root.style.setProperty("--look-x", `${((dx / length) * 2.6 * reach).toFixed(2)}px`);
      root.style.setProperty("--look-y", `${((dy / length) * 1.6 * reach).toFixed(2)}px`);
    }

    function lookAtFocus() {
      if (!focusTarget) return;
      const box = focusTarget.getBoundingClientRect();
      lookAt(box.left + Math.min(box.width * 0.35, 140), box.top + box.height / 2);
    }

    function updateMood() {
      const input = document.activeElement;
      if (input instanceof HTMLInputElement && input.id === "password") {
        setMood(input.type === "password" ? "closed" : "peek");
      } else {
        setMood("watch");
      }
    }

    const onMove = (event: PointerEvent) => {
      if (focusTarget) return;
      pointer = { x: event.clientX, y: event.clientY };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (pointer) lookAt(pointer.x, pointer.y);
      });
    };
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      focusTarget = target instanceof HTMLInputElement ? target : null;
      lookAtFocus();
      updateMood();
    };
    const onFocusOut = () => {
      focusTarget = null;
      setTimeout(updateMood, 0);
    };
    const observer = new MutationObserver(updateMood);
    const password = document.getElementById("password");
    if (password) observer.observe(password, { attributes: true, attributeFilter: ["type"] });

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    window.addEventListener("input", lookAtFocus);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("input", lookAtFocus);
    };
  }, []);

  return { rootRef, mood };
}
