const { createProxyMiddleware } = require('http-proxy-middleware');

/**
 * Proxy de desenvolvimento (Create React App).
 * Reencaminha pedidos da API para o backend, evitando CORS.
 *
 * Em Docker dev: PROXY_TARGET=http://api:3000
 * Em local:      PROXY_TARGET=http://localhost:3000 (default)
 */
const target = process.env.PROXY_TARGET || 'http://localhost:3000';

module.exports = function (app) {
  app.use(
    createProxyMiddleware(
      ['/auth', '/planos', '/exercicios', '/sessoes', '/users', '/avaliacoes', '/metas'],
      {
        target,
        changeOrigin: true,
      }
    )
  );
};
