import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../core/logger.js';
import contentRoutes from './routes/content.js';
import healthRoutes from './routes/health.js';
import castRoutes from './routes/cast.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const server = Fastify({
  logger: false // handled by our global logger
});

export async function initServer() {
  await server.register(cors, {
    origin: process.env.GITHUB_PAGES_ORIGIN || '*'
  });

  await server.register(fastifyStatic, {
    root: path.join(__dirname, '../../ui'),
    prefix: '/'
  });

  await server.register(contentRoutes);
  await server.register(healthRoutes);
  await server.register(castRoutes);

  logger.info('API server initialized');
}
