import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { PrometheusMetrics } from '@infrastructure/monitoring/prometheus-metrics';

interface MetricsPluginOptions {
  metrics: PrometheusMetrics;
}

const metricsPlugin: FastifyPluginAsync<MetricsPluginOptions> = async (fastify, opts) => {
  const { metrics } = opts;

  // Hook to capture request metrics
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Store start time for duration calculation
    (request as any).startTime = Date.now();
  });

  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = (request as any).startTime;
    if (!startTime) return;

    const duration = Date.now() - startTime;
    const method = request.method;
    const route = request.routerPath || request.url.split('?')[0];
    const statusCode = reply.statusCode.toString();

    // Increment HTTP request counter
    metrics.httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode,
    });

    // Record HTTP request duration
    metrics.httpRequestDuration.observe(
      {
        method,
        route,
        status_code: statusCode,
      },
      duration
    );
  });
};

export default fp(metricsPlugin);

