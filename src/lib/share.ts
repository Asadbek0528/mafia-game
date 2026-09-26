const LAN_HOST = process.env.NEXT_PUBLIC_LAN_HOST ?? "";

export function getPublicOrigin(): string {
  const { protocol, hostname, port } = window.location;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  if (isLocal && LAN_HOST) return `${protocol}//${LAN_HOST}${port ? `:${port}` : ""}`;
  return window.location.origin;
}

export function getRoomLink(roomId: string): string {
  return `${getPublicOrigin()}/room/${roomId}`;
}

function copyWithTextarea(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  let isCopied = false;
  try {
    isCopied = document.execCommand("copy");
  } catch {
    isCopied = false;
  }
  document.body.removeChild(textarea);
  return isCopied;
}

export async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return copyWithTextarea(text);
    }
  }
  return copyWithTextarea(text);
}

export type ShareResult = "shared" | "copied" | "failed" | "cancelled";

export async function shareLink(title: string, text: string, url: string): Promise<ShareResult> {
  if (navigator.share && window.isSecureContext) {
    try {
      await navigator.share({ title, text, url });
      return "shared";
    } catch (error) {
      if ((error as Error).name === "AbortError") return "cancelled";
    }
  }
  return (await copyText(url)) ? "copied" : "failed";
}

export function telegramShareUrl(text: string, url: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

export function whatsappShareUrl(text: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
}
