import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance) {
  fastify.get('/content', async (request, reply) => {
    reply.type('text/html');
    return `
      <div style="font-family: sans-serif; text-align: center; padding: 2rem;">
        <h1 style="color: #4285f4;">Google Nest Hub</h1>
        <p style="font-size: 1.5rem;">Time: ${new Date().toLocaleTimeString()}</p>
        <div style="margin-top: 2rem; padding: 1rem; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;">
          Update this file at <code>src/api/routes/content.ts</code> to change what you see here.
        </div>
      </div>
    `;
  });
}
