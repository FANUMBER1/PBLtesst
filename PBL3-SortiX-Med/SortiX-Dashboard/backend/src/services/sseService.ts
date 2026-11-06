import http from "node:http";

interface SSEClient {
  id: string;
  res: http.ServerResponse;
}

const clients: Map<string, SSEClient> = new Map();
type StreamEvent = { id: string; event: string; data: unknown };
const streamGlobal = globalThis as typeof globalThis & {
  sortixEventStream?: { listeners: Set<(entry: StreamEvent) => void>; history: StreamEvent[]; sequence: number };
};
const stream = streamGlobal.sortixEventStream ??= { listeners: new Set(), history: [], sequence: 0 };

export const SSEService = {
  subscribe(listener: (entry: StreamEvent) => void, lastEventId?: string): () => void {
    const index = lastEventId ? stream.history.findIndex((entry) => entry.id === lastEventId) : -1;
    if (index >= 0) stream.history.slice(index + 1).forEach(listener);
    stream.listeners.add(listener);
    return () => { stream.listeners.delete(listener); };
  },
  addClient(res: http.ServerResponse): string {
    const id = `sse_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });

    // Gửi tín hiệu kết nối ban đầu
    res.write(`retry: 3000\nevent: connected\ndata: ${JSON.stringify({ clientId: id, timestamp: new Date().toISOString() })}\n\n`);

    const client: SSEClient = { id, res };
    clients.set(id, client);

    res.on("close", () => {
      clients.delete(id);
    });
    res.on("error", () => {
      clients.delete(id);
    });

    return id;
  },

  hasEventId(id: string | undefined): boolean {
    return Boolean(id && stream.history.some((entry) => entry.id === id));
  },

  broadcast(event: string, data: unknown): void {
    const notificationId = (data as { notification?: { id?: string } } | null)?.notification?.id;
    if (notificationId && stream.history.some((entry) => entry.id === notificationId)) return;
    const entry = { id: notificationId || `sse_${Date.now()}_${++stream.sequence}`, event, data };
    if (event !== "ping") {
      stream.history.push(entry);
      if (stream.history.length > 1000) stream.history.shift();
    }
    for (const listener of stream.listeners) {
      try { listener(entry); } catch { stream.listeners.delete(listener); }
    }
    const payload = `id: ${entry.id}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const [id, client] of clients.entries()) {
      if (client.res.writableEnded || client.res.destroyed) {
        clients.delete(id);
        continue;
      }
      try {
        client.res.write(payload);
      } catch (err) {
        console.warn(`[SSEService] Lỗi gửi tới client ${id}, đang hủy kết nối:`, err);
        clients.delete(id);
      }
    }
  },

  getClientCount(): number {
    return clients.size;
  },

  closeAll(): void {
    for (const [id, client] of clients.entries()) {
      clients.delete(id);
      try { client.res.end(); } catch { /* already closed */ }
    }
  },
};

// Gửi ping định kỳ 30s để giữ kết nối SSE
const pingInterval = setInterval(() => {
  if (clients.size > 0) {
    SSEService.broadcast("ping", { time: Date.now() });
  }
}, 30000);
pingInterval.unref?.();

export function shutdownSSE(): void {
  clearInterval(pingInterval);
  SSEService.closeAll();
  stream.listeners.clear();
}
