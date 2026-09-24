import type { ClientMessage, ServerMessage } from '../../shared/protocol';

type Handler = (msg: ServerMessage) => void;
type StatusHandler = (open: boolean) => void;

/** Single WebSocket to the game server, created outside React. */
class Connection {
  private ws: WebSocket | null = null;
  private handlers = new Set<Handler>();
  private statusHandlers = new Set<StatusHandler>();
  private queue: ClientMessage[] = [];

  get open(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/ws`);
    this.ws = ws;
    ws.onopen = () => {
      for (const m of this.queue.splice(0)) ws.send(JSON.stringify(m));
      this.statusHandlers.forEach((h) => h(true));
    };
    ws.onmessage = (e) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      this.handlers.forEach((h) => h(msg));
    };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.statusHandlers.forEach((h) => h(false));
    };
  }

  close(): void {
    const ws = this.ws;
    this.ws = null;
    this.queue.length = 0;
    ws?.close();
  }

  send(msg: ClientMessage): void {
    if (this.open) this.ws!.send(JSON.stringify(msg));
    else if (msg.t === 'create' || msg.t === 'join') {
      this.queue.push(msg);
      this.connect();
    }
  }

  onMessage(h: Handler): () => void {
    this.handlers.add(h);
    return () => this.handlers.delete(h);
  }

  onStatus(h: StatusHandler): () => void {
    this.statusHandlers.add(h);
    return () => this.statusHandlers.delete(h);
  }
}

export const conn = new Connection();
