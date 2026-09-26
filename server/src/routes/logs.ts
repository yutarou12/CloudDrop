import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getLogs, clearAllLogs } from '../db/database.js';
import { toLogSummary } from '../types.js';

export const logsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // GET /api/logs - 履歴一覧取得
  fastify.get<{
    Querystring: { limit?: string; offset?: string };
  }>('/logs', async (request, reply) => {
    const limit = parseInt(request.query.limit || '100', 10);
    const offset = parseInt(request.query.offset || '0', 10);

    const records = getLogs(Math.min(limit, 500), Math.max(offset, 0));
    const logs = records.map(toLogSummary);

    return reply.status(200).send({ logs });
  });

  // DELETE /api/logs - 履歴全削除
  fastify.delete('/logs', async (_request, reply) => {
    clearAllLogs();
    return reply.status(204).send();
  });
};
