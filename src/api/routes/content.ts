import { FastifyInstance } from 'fastify';

let isAlternativeTheme = false;

export default async function contentRoutes(fastify: FastifyInstance) {
  fastify.post('/toggle-theme', async function toggleTheme(request, reply) {
    isAlternativeTheme = !isAlternativeTheme;
    return { success: true, isAlternativeTheme };
  });

  fastify.get('/content', async function getContent(request, reply) {
    reply.type('text/html');
    
    const primaryColor = isAlternativeTheme ? '#f4b400' : '#4285f4'; // Google Yellow vs Google Blue
    const secondaryColor = isAlternativeTheme ? '#db4437' : '#fff'; // Google Red vs White
    const gradient = isAlternativeTheme 
      ? 'linear-gradient(135deg, #f4b400 0%, #db4437 100%)' 
      : 'linear-gradient(135deg, #fff 0%, #4285f4 100%)';

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
            transition: background 0.5s ease;
          }
          .container {
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            width: 100vw;
            height: 100vh;
            background-image: radial-gradient(circle at center, ${isAlternativeTheme ? '#2d1b1b' : '#1a1c22'} 0%, #000 100%);
            transition: background-image 0.5s ease;
          }
          h1 { 
            font-family: 'Outfit', sans-serif;
            font-size: 3.5rem; 
            margin: 0;
            background: ${gradient};
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            transition: all 0.5s ease;
          }
          .time { 
            font-size: 10rem; 
            font-weight: 700; 
            margin: 0.2rem 0;
            letter-spacing: -0.05em;
            animation: pulse 4s ease-in-out infinite;
            color: ${secondaryColor};
            transition: color 0.5s ease;
          }
          .info {
            font-size: 1.6rem;
            color: #9da3ae;
            background: rgba(255, 255, 255, 0.05);
            padding: 1rem 2.5rem;
            border-radius: 100px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            cursor: pointer;
            transition: all 0.3s ease;
            user-select: none;
            -webkit-tap-highlight-color: transparent;
          }
          .info:hover {
            background: rgba(255, 255, 255, 0.15);
            transform: scale(1.05);
            border-color: ${primaryColor};
            color: #fff;
          }
          .info:active {
            transform: scale(0.95);
            opacity: 0.8;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; filter: drop-shadow(0 0 0px transparent); }
            50% { opacity: 0.8; filter: drop-shadow(0 0 40px ${primaryColor}33); }
          }
        </style>
        <script>
          // Self-refresh every 5 seconds to get latest state/time
          setInterval(() => {
            location.reload();
          }, 5000);

          function toggleTheme() {
            fetch('/toggle-theme', { method: 'POST' })
              .then(() => location.reload());
          }
        </script>
      </head>
      <body>
        <div class="container">
          <h1>Pi Projects</h1>
          <div class="time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
          <div class="info" onclick="toggleTheme()">
            ${isAlternativeTheme ? 'Alternative Theme' : 'Nest Hub Display Active'}
          </div>
        </div>
      </body>
      </html>
    `;
  });
}
