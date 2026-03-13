import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance) {
  fastify.get('/content', async (request, reply) => {
    reply.type('text/html');
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Pi Projects Content</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Outfit:wght@700&display=swap" rel="stylesheet">
        <style>
          body { 
            background: #000; 
            margin: 0; 
            padding: 0;
            overflow: hidden;
            color: #fff;
            font-family: 'Inter', sans-serif;
          }
          .container {
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            width: 100vw;
            height: 100vh;
            background-image: radial-gradient(circle at center, #1a1c22 0%, #000 100%);
          }
          h1 { 
            font-family: 'Outfit', sans-serif;
            font-size: 3.5rem; 
            margin: 0;
            background: linear-gradient(135deg, #fff 0%, #4285f4 100%);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .time { 
            font-size: 10rem; 
            font-weight: 700; 
            margin: 0.2rem 0;
            letter-spacing: -0.05em;
            animation: pulse 4s ease-in-out infinite;
          }
          .info {
            font-size: 1.6rem;
            color: #9da3ae;
            background: rgba(255, 255, 255, 0.05);
            padding: 1rem 2.5rem;
            border-radius: 100px;
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; filter: drop-shadow(0 0 0px transparent); }
            50% { opacity: 0.8; filter: drop-shadow(0 0 40px rgba(66, 133, 244, 0.2)); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Pi Projects</h1>
          <div class="time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
          <div class="info">Nest Hub Display Active</div>
        </div>
      </body>
      </html>
    `;
  });
}
