import { FastifyPluginAsync } from 'fastify';
import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';

const docsRoutes: FastifyPluginAsync = async (fastify) => {
  const openApiPath = join(process.cwd(), 'openapi.yaml');

  fastify.get('/docs', async (request, reply) => {
    const staticDocsPath = join(process.cwd(), 'public', 'docs.html');

    if (existsSync(staticDocsPath)) {
      const html = readFileSync(staticDocsPath, 'utf8');
      return reply.type('text/html').send(html);
    }

    // Use relative URL to work with both HTTP and HTTPS
    // The relative path will use the same protocol as the current page
    const specUrl = 'openapi.json'; // Relative path since we're at /api/v1/docs

    const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>WokiBrain API Documentation</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="WokiBrain API - Enterprise restaurant booking engine">
  </head>
  <body>
    <redoc spec-url="${specUrl}"></redoc>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
  </body>
</html>
    `;

    return reply.type('text/html').send(html);
  });

  fastify.get('/openapi.yaml', async (_request, reply) => {
    try {
      if (!existsSync(openApiPath)) {
        fastify.log.error({ path: openApiPath }, 'OpenAPI spec not found');
        return reply.code(404).send({
          error: 'OpenAPI spec not found',
          path: openApiPath,
        });
      }

      const openApiSpec = readFileSync(openApiPath, 'utf8');
      return reply.type('text/yaml').send(openApiSpec);
    } catch (error) {
      fastify.log.error(error, 'Error reading OpenAPI spec');
      return reply.code(500).send({
        error: 'Failed to read OpenAPI spec',
        message: (error as Error).message,
      });
    }
  });

  fastify.get('/openapi.json', async (_request, reply) => {
    try {
      if (!existsSync(openApiPath)) {
        return reply.code(404).send({ error: 'OpenAPI spec not found' });
      }

      const yaml = await import('yaml');
      const openApiSpec = readFileSync(openApiPath, 'utf8');
      const jsonSpec = yaml.parse(openApiSpec);
      return reply.type('application/json').send(jsonSpec);
    } catch (error) {
      fastify.log.error(error, 'Error parsing OpenAPI spec');
      return reply.code(500).send({
        error: 'Failed to parse OpenAPI spec',
        message: (error as Error).message,
      });
    }
  });

  // Serve static assets for AsyncAPI docs (CSS, JS) - must be registered BEFORE the main route
  fastify.get('/docs/websockets/*', async (request, reply) => {
    // Extract the path after /docs/websockets/
    const urlPath = request.url;
    const match = urlPath.match(/\/docs\/websockets\/(.+)$/);
    if (!match) {
      return reply.code(404).send({ error: 'Invalid path' });
    }
    const assetRelativePath = match[1];
    const assetPath = join(process.cwd(), 'public', 'websockets-docs.html', assetRelativePath);

    if (!existsSync(assetPath)) {
      return reply.code(404).send({ error: 'Asset not found' });
    }

    const stats = statSync(assetPath);
    if (stats.isDirectory()) {
      return reply.code(404).send({ error: 'Asset not found' });
    }

    const content = readFileSync(assetPath);
    const ext = assetPath.split('.').pop()?.toLowerCase();
    const contentType =
      ext === 'css'
        ? 'text/css'
        : ext === 'js'
          ? 'application/javascript'
          : ext === 'png'
            ? 'image/png'
            : ext === 'jpg' || ext === 'jpeg'
              ? 'image/jpeg'
              : ext === 'svg'
                ? 'image/svg+xml'
                : 'application/octet-stream';

    return reply.type(contentType).send(content);
  });

  fastify.get('/docs/websockets', async (_request, reply) => {
    // Serve modern static HTML documentation
    const staticDocsPath = join(process.cwd(), 'public', 'websockets-docs.html');

    if (existsSync(staticDocsPath) && !statSync(staticDocsPath).isDirectory()) {
      const html = readFileSync(staticDocsPath, 'utf8');
      return reply.type('text/html').send(html);
    }

    // Fallback to legacy static HTML if exists
    const legacyDocsPath = join(process.cwd(), 'public', 'websockets-docs-static.html');
    if (existsSync(legacyDocsPath)) {
      const html = readFileSync(legacyDocsPath, 'utf8');
      return reply.type('text/html').send(html);
    }

    return reply.code(404).send({
      error: 'WebSocket documentation not found',
      message: 'WebSocket documentation file not found',
    });
  });

  fastify.get('/asyncapi.yaml', async (_request, reply) => {
    const asyncApiPath = join(process.cwd(), 'asyncapi.yaml');

    if (!existsSync(asyncApiPath)) {
      return reply.code(404).send({ error: 'AsyncAPI spec not found' });
    }

    const asyncApiSpec = readFileSync(asyncApiPath, 'utf8');
    return reply.type('text/yaml').send(asyncApiSpec);
  });

  fastify.get('/asyncapi.json', async (_request, reply) => {
    const asyncApiPath = join(process.cwd(), 'asyncapi.yaml');

    if (!existsSync(asyncApiPath)) {
      return reply.code(404).send({ error: 'AsyncAPI spec not found' });
    }

    try {
      const yaml = await import('yaml');
      const asyncApiSpec = readFileSync(asyncApiPath, 'utf8');
      const jsonSpec = yaml.parse(asyncApiSpec);
      return reply.type('application/json').send(jsonSpec);
    } catch (error) {
      fastify.log.error(error, 'Error parsing AsyncAPI spec');
      return reply.code(500).send({
        error: 'Failed to parse AsyncAPI spec',
        message: (error as Error).message,
      });
    }
  });
};

export default docsRoutes;
