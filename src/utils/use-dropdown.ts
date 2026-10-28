import { useEffect, useRef, useState } from "react";

export function useDropdown<T extends HTMLElement = HTMLDivElement>() {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<T>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  return {
    isOpen,
    rootRef,
    toggle: () => setIsOpen((old) => !old),
    close: () => setIsOpen(false),
    choose: (action: () => void) => {
      setIsOpen(false);
      action();
    },
  };
}
