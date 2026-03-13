import { FastifyInstance } from 'fastify';

export default async function contentRoutes(fastify: FastifyInstance) {
  fastify.get('/api/status', async function getStatus(request, reply) {
    reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    reply.header('Pragma', 'no-cache');
    reply.header('Expires', '0');
    return {
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    };
  });

  fastify.get('/content', async function getContent(request, reply) {
    reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    reply.header('Pragma', 'no-cache');
    reply.header('Expires', '0');
    reply.type('text/html');
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Pi Projects Content</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Outfit:wght@700&display=swap" rel="stylesheet">
        <style>
          :root {
            --primary-blue: #4285f4;
            --primary-yellow: #f4b400;
            --primary-red: #db4437;
            
            --bg-glow-normal: #1a1c22;
            --bg-glow-alt: #2d1b1b;
            
            --text-main: #fff;
            --text-secondary: #9da3ae;
            
            /* Current Theme Variables */
            --theme-primary: var(--primary-blue);
            --theme-secondary: #fff;
            --theme-gradient: linear-gradient(135deg, #fff 0%, var(--primary-blue) 100%);
            --theme-bg-glow: var(--bg-glow-normal);
          }

          body.alt-theme {
            --theme-primary: var(--primary-yellow);
            --theme-secondary: var(--primary-red);
            --theme-gradient: linear-gradient(135deg, var(--primary-yellow) 0%, var(--primary-red) 100%);
            --theme-bg-glow: var(--bg-glow-alt);
          }

          body { 
            background: #000; 
            margin: 0; 
            padding: 0;
            overflow: hidden;
            color: var(--text-main);
            font-family: 'Inter', sans-serif;
          }

          .container {
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            width: 100vw;
            height: 100vh;
            background-image: radial-gradient(circle at center, var(--theme-bg-glow) 0%, #000 100%);
            transition: all 0.8s ease-in-out;
          }

          h1 { 
            font-family: 'Outfit', sans-serif;
            font-size: 3.5rem; 
            margin: 0;
            background: var(--theme-gradient);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            transition: all 0.8s ease-in-out;
          }

          .time { 
            font-size: 10rem; 
            font-weight: 700; 
            margin: 0.2rem 0;
            letter-spacing: -0.05em;
            animation: pulse 4s ease-in-out infinite;
            color: var(--theme-secondary);
            transition: color 0.8s ease-in-out;
          }

          .info {
            font-size: 1.6rem;
            color: var(--text-secondary);
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
            border-color: var(--theme-primary);
            color: #fff;
          }

          .info:active {
            transform: scale(0.95);
            opacity: 0.8;
          }

          @keyframes pulse {
            0%, 100% { opacity: 1; filter: drop-shadow(0 0 0px transparent); }
            50% { opacity: 0.8; filter: drop-shadow(0 0 40px var(--theme-primary)33); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Pi Projects</h1>
          <div id="clock" class="time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
          <div id="status-btn" class="info">Nest Hub Display Active</div>
        </div>

        <script>
          (function() {
            const clockEl = document.getElementById('clock');
            const btnEl = document.getElementById('status-btn');
            let isAlt = false;
            
            async function updateClock() {
              try {
                // Cache busting timestamp for AJAX
                const res = await fetch('/api/status?t=' + Date.now());
                if (res.ok) {
                  const data = await res.json();
                  if (clockEl.innerText !== data.time) {
                    clockEl.innerText = data.time;
                  }
                }
              } catch (err) {
                console.error('[UI] Clock update failed:', err);
              }
            }

            function toggleTheme() {
              isAlt = !isAlt;
              if (isAlt) {
                document.body.classList.add('alt-theme');
                btnEl.innerText = 'Alternative Theme';
              } else {
                document.body.classList.remove('alt-theme');
                btnEl.innerText = 'Nest Hub Display Active';
              }
              console.log('[UI] Theme toggled client-side:', isAlt);
            }

            function handleToggle(e) {
              if (e.type === 'touchstart') e.preventDefault();
              toggleTheme();
            }

            btnEl.addEventListener('click', handleToggle);
            btnEl.addEventListener('touchstart', handleToggle);
            
            // Poll every 1 second for smooth clock updates
            setInterval(updateClock, 1000);
            
            console.log('[UI] Initialized client-side theme and clock polling');
          })();
        </script>
      </body>
      </html>
    `;
  });
}
