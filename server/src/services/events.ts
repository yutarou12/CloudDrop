import { FastifyReply } from 'fastify';

type SseClient = {
  id: string;
  reply: FastifyReply;
};

const clients = new Map<string, SseClient>();

/**
 * SSEクライアントを登録
 */
export function registerSseClient(id: string, reply: FastifyReply): void {
  clients.set(id, { id, reply });
}

/**
 * SSEクライアントを解除
 */
export function unregisterSseClient(id: string): void {
  clients.delete(id);
}

/**
 * 全接続クライアントへイベントをブロードキャスト
 */
export function broadcastFileChange(type: 'created' | 'deleted' | 'expired'): void {
  const data = JSON.stringify({ type, timestamp: new Date().toISOString() });
  const message = `event: file-change\ndata: ${data}\n\n`;

  for (const [id, client] of clients.entries()) {
    try {
      client.reply.raw.write(message);
    } catch {
      clients.delete(id);
    }
  }
}
