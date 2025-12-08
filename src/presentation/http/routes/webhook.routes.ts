import { FastifyPluginAsync } from 'fastify';
import { CreateWebhookUseCase } from '@application/use-cases/create-webhook.use-case';
import { ListWebhooksUseCase } from '@application/use-cases/list-webhooks.use-case';
import { GetWebhookUseCase } from '@application/use-cases/get-webhook.use-case';
import { UpdateWebhookUseCase } from '@application/use-cases/update-webhook.use-case';
import { DeleteWebhookUseCase } from '@application/use-cases/delete-webhook.use-case';
import { WebhookEvent } from '@domain/entities/webhook.entity';
import { z } from 'zod';

interface WebhookRoutesOptions {
  createWebhookUseCase: CreateWebhookUseCase;
  listWebhooksUseCase: ListWebhooksUseCase;
  getWebhookUseCase: GetWebhookUseCase;
  updateWebhookUseCase: UpdateWebhookUseCase;
  deleteWebhookUseCase: DeleteWebhookUseCase;
}

const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.nativeEnum(WebhookEvent)).min(1),
  secret: z.string().optional(),
});

const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.nativeEnum(WebhookEvent)).min(1).optional(),
  active: z.boolean().optional(),
});

const webhookRoutes: FastifyPluginAsync<WebhookRoutesOptions> = async (fastify, opts) => {
  // Create webhook
  fastify.post<{ Body: z.infer<typeof createWebhookSchema> }>(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          required: ['url', 'events'],
          properties: {
            url: { type: 'string', format: 'uri' },
            events: {
              type: 'array',
              items: {
                type: 'string',
                enum: Object.values(WebhookEvent),
              },
              minItems: 1,
            },
            secret: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              url: { type: 'string' },
              events: {
                type: 'array',
                items: { type: 'string' },
              },
              active: { type: 'boolean' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const validated = createWebhookSchema.parse(request.body);
        const result = await opts.createWebhookUseCase.execute({
          url: validated.url,
          events: validated.events,
          secret: validated.secret || '',
        });
        return reply.code(201).send(result);
      } catch (error: unknown) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'VALIDATION_ERROR',
            detail: 'Invalid input data',
            issues: error.errors.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          });
        }
        if (error instanceof Error) {
          return reply.code(400).send({
            error: 'BAD_REQUEST',
            detail: error.message,
          });
        }
        throw error;
      }
    }
  );

  // List webhooks
  fastify.get(
    '/',
    {
      schema: {
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                url: { type: 'string' },
                events: {
                  type: 'array',
                  items: { type: 'string' },
                },
                active: { type: 'boolean' },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const result = await opts.listWebhooksUseCase.execute();
      return reply.code(200).send(result);
    }
  );

  // Get webhook by ID
  fastify.get<{ Params: { webhookId: string } }>(
    '/:webhookId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['webhookId'],
          properties: {
            webhookId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              url: { type: 'string' },
              events: {
                type: 'array',
                items: { type: 'string' },
              },
              active: { type: 'boolean' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { webhookId } = request.params;
        const result = await opts.getWebhookUseCase.execute(webhookId);
        return reply.code(200).send(result);
      } catch (error: unknown) {
        if (error instanceof Error && error.message.includes('not found')) {
          return reply.code(404).send({
            error: 'NOT_FOUND',
            detail: error.message,
          });
        }
        throw error;
      }
    }
  );

  // Update webhook
  fastify.put<{ Params: { webhookId: string }; Body: z.infer<typeof updateWebhookSchema> }>(
    '/:webhookId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['webhookId'],
          properties: {
            webhookId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            url: { type: 'string', format: 'uri' },
            events: {
              type: 'array',
              items: {
                type: 'string',
                enum: Object.values(WebhookEvent),
              },
              minItems: 1,
            },
            active: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              url: { type: 'string' },
              events: {
                type: 'array',
                items: { type: 'string' },
              },
              active: { type: 'boolean' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { webhookId } = request.params;
        const validated = updateWebhookSchema.parse(request.body);
        const result = await opts.updateWebhookUseCase.execute(webhookId, validated);
        return reply.code(200).send(result);
      } catch (error: unknown) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'VALIDATION_ERROR',
            detail: 'Invalid input data',
            issues: error.errors.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          });
        }
        if (error instanceof Error) {
          if (error.message.includes('not found')) {
            return reply.code(404).send({
              error: 'NOT_FOUND',
              detail: error.message,
            });
          }
          return reply.code(400).send({
            error: 'BAD_REQUEST',
            detail: error.message,
          });
        }
        throw error;
      }
    }
  );

  // Delete webhook
  fastify.delete<{ Params: { webhookId: string } }>(
    '/:webhookId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['webhookId'],
          properties: {
            webhookId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { webhookId } = request.params;
        await opts.deleteWebhookUseCase.execute(webhookId);
        return reply.code(200).send({
          message: 'Webhook deleted successfully.',
        });
      } catch (error: unknown) {
        if (error instanceof Error && error.message.includes('not found')) {
          return reply.code(404).send({
            error: 'NOT_FOUND',
            detail: error.message,
          });
        }
        throw error;
      }
    }
  );
};

export default webhookRoutes;

