import { useEffect } from "react";

export function useTimeout(active: unknown, callback: () => void, ms: number) {
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(callback, ms);
    return () => clearTimeout(timer);
  }, [active, callback, ms]);
}
