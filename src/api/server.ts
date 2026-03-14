import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../core/logger.js';
import contentRoutes from './routes/content.js';
import healthRoutes from './routes/health.js';
import castRoutes from './routes/cast.js';
import heartbeatRoutes from './routes/heartbeat.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const server = Fastify({
  logger: false // handled by our global logger
});

export async function initServer() {
  await server.register(cors, {
    origin: '*'
  });

  // Serve Dashboard static files
  await server.register(fastifyStatic, {
    root: path.join(__dirname, '../../ui'),
    prefix: '/ui/'
    // decorateReply is true by default here
  });

  // Serve Receiver static files
  await server.register(fastifyStatic, {
    root: path.join(__dirname, '../../receiver'),
    prefix: '/receiver-static/',
    decorateReply: false // Only one registration can decorate reply.sendFile
  });

  // Root route serves dashboard
  server.get('/', async (request, reply) => {
    return reply.sendFile('index.html', path.join(__dirname, '../../ui'));
  });

  // Dedicated route for receiver to inject public URL
  server.get('/receiver', async (request, reply) => {
    const fs = await import('node:fs/promises');
    const receiverPath = path.join(__dirname, '../../receiver/index.html');
    let html = await fs.readFile(receiverPath, 'utf8');
    
    // Inject current tunnel URL
    const publicUrl = process.env.TUNNEL_PUBLIC_URL || '';
    html = html.replace("const TUNNEL_PUBLIC_URL = '';", `const TUNNEL_PUBLIC_URL = '${publicUrl}';`);
    
    reply.type('text/html');
    return html;
  });

  await server.register(contentRoutes);
  await server.register(healthRoutes);
  await server.register(castRoutes);
  await server.register(heartbeatRoutes);

  logger.info('API server initialized');
}
