import { WebSocketServer } from "ws";

const PORT = Number(process.env.WS_PORT ?? 3001);

const channels = new Map();

const server = new WebSocketServer({ port: PORT, host: "0.0.0.0" });

server.on("listening", () => {
  console.log(`  WebSocket:     ws://localhost:${PORT}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.log(`  WebSocket: порт ${PORT} уже занят — работает другой сервер, используем его`);
    return;
  }
  console.error("WebSocket error:", error);
});

server.on("connection", (socket, request) => {
  const channel = new URL(request.url ?? "/", "http://localhost").pathname;

  if (!channels.has(channel)) channels.set(channel, new Set());
  const members = channels.get(channel);
  members.add(socket);

  socket.isAlive = true;
  socket.on("pong", () => {
    socket.isAlive = true;
  });

  socket.on("message", (data) => {
    const text = data.toString();
    for (const other of members) {
      if (other !== socket && other.readyState === other.OPEN) other.send(text);
    }
  });

  socket.on("close", () => {
    members.delete(socket);
    if (members.size === 0) channels.delete(channel);
  });
});

setInterval(() => {
  for (const socket of server.clients) {
    if (!socket.isAlive) {
      socket.terminate();
      continue;
    }
    socket.isAlive = false;
    socket.ping();
  }
}, 30_000).unref();
