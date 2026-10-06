import { randomUUID } from 'node:crypto';
import { FastifyPluginAsync } from 'fastify';
import { createLink, getActiveLinks, deleteLink } from '../db/database.js';

export const linksRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/links', async () => ({ links: getActiveLinks(new Date().toISOString()) }));

  fastify.post<{ Body: { url: string } }>('/links', {
    schema: {
      body: {
        type: 'object', required: ['url'], additionalProperties: false,
        properties: { url: { type: 'string', minLength: 1, maxLength: 8192 } },
      },
    },
    bodyLimit: 16384,
  }, async (request, reply) => {
    const url = request.body.url.trim();
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Invalid protocol');
    } catch {
      return reply.status(400).send({ message: 'http:// または https:// で始まる有効なURLを入力してください。' });
    }
    const now = Date.now();
    const link = {
      id: randomUUID(), url,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
    };
    createLink(link);
    return reply.status(201).send(link);
  });

  fastify.delete<{ Params: { id: string } }>('/links/:id', async (request, reply) => {
    deleteLink(request.params.id);
    return reply.status(204).send();
  });
};
