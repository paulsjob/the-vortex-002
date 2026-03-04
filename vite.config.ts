import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

let lastLiveFeedState: any = null;

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'renderless-livefeed-dev-endpoint',
      configureServer(server) {
        server.middlewares.use('/api/renderless/livefeed', (req, res) => {
          if (req.method === 'GET') {
            if (!lastLiveFeedState) {
              res.statusCode = 204;
              res.end();
              return;
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(lastLiveFeedState));
            return;
          }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', () => {
              try {
                lastLiveFeedState = body ? JSON.parse(body) : null;
                res.statusCode = 204;
              } catch {
                res.statusCode = 400;
              }
              res.end();
            });
            return;
          }

          res.statusCode = 405;
          res.end();
        });
      },
    },
  ],
});
