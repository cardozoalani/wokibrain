import { FastifyPluginAsync } from 'fastify';
import { PrometheusMetrics } from '@infrastructure/monitoring/prometheus-metrics';

interface MetricsRoutesOptions {
  metrics: PrometheusMetrics;
}

const metricsRoutes: FastifyPluginAsync<MetricsRoutesOptions> = async (fastify, opts) => {
  fastify.get('/metrics', async (_request, reply) => {
    try {
      const metrics = await opts.metrics.getMetrics();
      return reply
        .code(200)
        .header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
        .send(metrics);
    } catch (error) {
      fastify.log.error(error, 'Error getting metrics');
      return reply.code(500).send({
        error: 'Failed to get metrics',
        message: (error as Error).message,
      });
    }
  });
};

export default metricsRoutes;

