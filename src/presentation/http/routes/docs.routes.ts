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
          path: openApiPath
        });
      }

      const openApiSpec = readFileSync(openApiPath, 'utf8');
      return reply.type('text/yaml').send(openApiSpec);
    } catch (error) {
      fastify.log.error(error, 'Error reading OpenAPI spec');
      return reply.code(500).send({
        error: 'Failed to read OpenAPI spec',
        message: (error as Error).message
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
        message: (error as Error).message
      });
    }
  });

  fastify.get('/docs/websockets', async (_request, reply) => {
    // Try AsyncAPI-generated docs first (check if it's a directory with index.html)
    const asyncApiDocsDir = join(process.cwd(), 'public', 'websockets-docs.html');
    const asyncApiDocsIndex = join(asyncApiDocsDir, 'index.html');

    // Fallback to static HTML if AsyncAPI docs don't exist
    const staticDocsPath = join(process.cwd(), 'public', 'websockets-docs-static.html');

    // Check if AsyncAPI docs directory exists with index.html
    if (existsSync(asyncApiDocsIndex)) {
      const html = readFileSync(asyncApiDocsIndex, 'utf8');
      return reply.type('text/html').send(html);
    }

    // Check if AsyncAPI docs is a file (legacy format)
    if (existsSync(asyncApiDocsDir) && !statSync(asyncApiDocsDir).isDirectory()) {
      const html = readFileSync(asyncApiDocsDir, 'utf8');
      return reply.type('text/html').send(html);
    }

    // Fallback to static HTML
    if (existsSync(staticDocsPath)) {
      const html = readFileSync(staticDocsPath, 'utf8');
      return reply.type('text/html').send(html);
    }

    return reply.code(404).send({
      error: 'WebSocket documentation not found',
      message: 'Run "npm run docs:websockets" to generate documentation'
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
        message: (error as Error).message
      });
    }
  });
};

export default docsRoutes;

