import { SafetyService } from "@/services/safetyService";
import { SSEService } from "@/services/sseService";
import { SyncService } from "@/services/syncService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  const cleanup = () => {
    unsubscribe?.();
    if (timer) clearInterval(timer);
    request.signal.removeEventListener("abort", cleanup);
  };
  const lastEventId = request.headers.get("last-event-id") || undefined;
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const send = (event: string, data: unknown, id?: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`${id ? `id: ${id}\n` : ""}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
          cleanup();
        }
      };
      unsubscribe = SSEService.subscribe(
        (entry) => send(entry.event, entry.data, entry.id),
        lastEventId
      );
      send("status", SafetyService.getStatus());
      // If the browser reconnects after the bounded replay buffer has rolled
      // over, send the current authoritative snapshot so it cannot remain
      // stale until the next mutation.
      if (lastEventId && !SSEService.hasEventId(lastEventId)) {
        send("state_sync", { state: SyncService.getState() });
      }
      timer = setInterval(() => {
        send("ping", { time: Date.now() });
      }, 30000);
      request.signal.addEventListener("abort", cleanup, { once: true });
    },
    cancel: cleanup,
  });
  return new Response(stream, { headers: {
    "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive",
  } });
}
