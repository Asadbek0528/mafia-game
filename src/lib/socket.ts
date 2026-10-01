import { useCallback, useEffect, useRef, useState } from "react";

import { getToken } from "./auth";

const WS_SETTING = process.env.NEXT_PUBLIC_WS_URL ?? "auto";
const WS_PORT = process.env.NEXT_PUBLIC_WS_PORT ?? "3001";
const ROOM_PATH = process.env.NEXT_PUBLIC_WS_ROOM_PATH ?? "/ws/room/{id}";
const GAME_PATH = process.env.NEXT_PUBLIC_WS_GAME_PATH ?? "/ws/game/{id}";
const MAX_RETRY_MS = 8000;

export const WS_PATHS = {
  room: (roomId: string) => ROOM_PATH.replace("{id}", roomId),
  game: (gameId: string) => GAME_PATH.replace("{id}", gameId),
};

function getServerUrls(): string[] {
  if (WS_SETTING !== "auto") return [WS_SETTING.replace(/\/$/, "")];
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return [`${protocol}://${window.location.host}`, `${protocol}://${window.location.hostname}:${WS_PORT}`];
}

function buildUrl(server: string, path: string): string {
  const token = getToken();
  const url = server + path;
  if (!token) return url;
  const separator = path.includes("?") ? "&" : "?";
  return `${url}${separator}token=${encodeURIComponent(token)}`;
}

export type LiveUpdates = {
  isLive: boolean;
  notify: (type?: string, extra?: Record<string, unknown>) => void;
};

export function useLiveUpdates(path: string | null, onMessage: (data: unknown) => void): LiveUpdates {
  const [isLive, setIsLive] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  const handlerRef = useRef(onMessage);
  useEffect(() => {
    handlerRef.current = onMessage;
  });

  useEffect(() => {
    if (!path || !WS_SETTING) return;

    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let serverIndex = 0;
    let isStopped = false;
    const servers = getServerUrls();

    function scheduleReconnect() {
      attempt += 1;
      const delay = Math.min(MAX_RETRY_MS, 500 * 2 ** attempt);
      clearTimeout(retryTimer);
      retryTimer = setTimeout(connect, delay);
    }

    function reconnectNow() {
      if (isStopped || document.hidden || socketRef.current) return;
      attempt = 0;
      clearTimeout(retryTimer);
      connect();
    }

    function connect() {
      let socket: WebSocket;
      let wasOpen = false;
      try {
        socket = new WebSocket(buildUrl(servers[serverIndex % servers.length], path!));
      } catch {
        scheduleReconnect();
        return;
      }
      socketRef.current = socket;

      socket.onopen = () => {
        wasOpen = true;
        attempt = 0;
        setIsLive(true);
        socket.send(JSON.stringify({ type: "hello" }));
      };

      socket.onmessage = (event) => {
        let data: unknown = event.data;
        try {
          data = JSON.parse(event.data);
        } catch {
          data = event.data;
        }
        handlerRef.current(data);
      };

      socket.onclose = () => {
        if (socketRef.current !== socket) return;
        socketRef.current = null;
        setIsLive(false);
        if (!wasOpen) serverIndex += 1;
        if (!isStopped) scheduleReconnect();
      };

      socket.onerror = () => socket.close();
    }

    connect();
    document.addEventListener("visibilitychange", reconnectNow);
    window.addEventListener("online", reconnectNow);

    return () => {
      isStopped = true;
      clearTimeout(retryTimer);
      document.removeEventListener("visibilitychange", reconnectNow);
      window.removeEventListener("online", reconnectNow);
      const socket = socketRef.current;
      socketRef.current = null;
      socket?.close();
      setIsLive(false);
    };
  }, [path]);

  const notify = useCallback((type = "update", extra: Record<string, unknown> = {}) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ ...extra, type }));
  }, []);

  return { isLive, notify };
}
