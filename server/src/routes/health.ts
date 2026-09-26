import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import os from 'node:os';
import { CONFIG } from '../config.js';
import { getTotalActiveSize } from '../db/database.js';

export function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      // IPv4かつ内部ループバック以外を優先
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

export const healthRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/health', async (_request, reply) => {
    const nowIso = new Date().toISOString();
    const usedBytes = getTotalActiveSize(nowIso);
    const localIp = getLocalIpAddress();

    return reply.status(200).send({
      status: 'ok',
      timestamp: nowIso,
      server: {
        host: os.hostname(),
        localIp,
        port: CONFIG.PORT,
      },
      limits: {
        maxFileSizeBytes: CONFIG.MAX_FILE_SIZE,
        maxTotalSizeBytes: CONFIG.MAX_TOTAL_SIZE,
        usedBytes,
        expireSeconds: CONFIG.EXPIRE_SECONDS,
      },
    });
  });
};
