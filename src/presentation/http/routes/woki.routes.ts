import { FastifyPluginAsync } from 'fastify';
import { DiscoverSeatsUseCase } from '@application/use-cases/discover-seats.use-case';
import { CreateBookingUseCase } from '@application/use-cases/create-booking.use-case';
import { ListBookingsUseCase } from '@application/use-cases/list-bookings.use-case';
import { DiscoverSeatsInputSchema } from '@application/dtos/discover-seats.dto';
import { CreateBookingInputSchema } from '@application/dtos/create-booking.dto';
import { ListBookingsInputSchema } from '@application/dtos/list-bookings.dto';

interface WokiRoutesOptions {
  discoverSeatsUseCase: DiscoverSeatsUseCase;
  createBookingUseCase: CreateBookingUseCase;
  listBookingsUseCase: ListBookingsUseCase;
}

const wokiRoutes: FastifyPluginAsync<WokiRoutesOptions> = async (fastify, opts) => {
  fastify.get(
    '/discover',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            restaurantId: { type: 'string' },
            sectorId: { type: 'string' },
            date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            partySize: { type: 'number' },
            duration: { type: 'number' },
            windowStart: { type: 'string' },
            windowEnd: { type: 'string' },
            limit: { type: 'number' },
          },
          required: ['restaurantId', 'sectorId', 'date', 'partySize', 'duration'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              slotMinutes: { type: 'number' },
              durationMinutes: { type: 'number' },
              candidates: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    kind: { type: 'string', enum: ['single', 'combo'] },
                    tableIds: { type: 'array', items: { type: 'string' } },
                    start: { type: 'string' },
                    end: { type: 'string' },
                    score: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const input = DiscoverSeatsInputSchema.parse(request.query);
      const result = await opts.discoverSeatsUseCase.execute(input);
      return reply.code(200).send(result);
    }
  );

  fastify.get(
    '/bookings',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            restaurantId: { type: 'string' },
            sectorId: { type: 'string' },
            date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          },
          required: ['restaurantId', 'sectorId', 'date'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              date: { type: 'string' },
              bookings: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    restaurantId: { type: 'string' },
                    sectorId: { type: 'string' },
                    tableIds: { type: 'array', items: { type: 'string' } },
                    partySize: { type: 'number' },
                    start: { type: 'string' },
                    end: { type: 'string' },
                    durationMinutes: { type: 'number' },
                    status: { type: 'string' },
                    createdAt: { type: 'string' },
                    updatedAt: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const input = ListBookingsInputSchema.parse(request.query);
      const result = await opts.listBookingsUseCase.execute(input);
      return reply.code(200).send(result);
    }
  );

  fastify.post(
    '/bookings',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            restaurantId: { type: 'string' },
            sectorId: { type: 'string' },
            partySize: { type: 'number' },
            durationMinutes: { type: 'number' },
            date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            windowStart: { type: 'string' },
            windowEnd: { type: 'string' },
          },
          required: ['restaurantId', 'sectorId', 'partySize', 'durationMinutes', 'date'],
        },
        headers: {
          type: 'object',
          properties: {
            'idempotency-key': { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              restaurantId: { type: 'string' },
              sectorId: { type: 'string' },
              tableIds: { type: 'array', items: { type: 'string' } },
              partySize: { type: 'number' },
              start: { type: 'string' },
              end: { type: 'string' },
              durationMinutes: { type: 'number' },
              status: { type: 'string' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const input = CreateBookingInputSchema.parse(request.body);
      const idempotencyKey = request.headers['idempotency-key'] as string | undefined;
      const result = await opts.createBookingUseCase.execute(input, idempotencyKey);
      return reply.code(201).send(result);
    }
  );
};

export default wokiRoutes;
