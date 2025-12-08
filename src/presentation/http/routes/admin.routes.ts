import { FastifyPluginAsync } from 'fastify';
import { MongoDBRestaurantRepository } from '@infrastructure/repositories/mongodb-restaurant.repository';
import { MongoDBSectorRepository } from '@infrastructure/repositories/mongodb-sector.repository';
import { MongoDBTableRepository } from '@infrastructure/repositories/mongodb-table.repository';
import { Restaurant } from '@domain/entities/restaurant.entity';
import { Sector } from '@domain/entities/sector.entity';
import { Table } from '@domain/entities/table.entity';
import { Timezone } from '@domain/value-objects/timezone.vo';
import { TimeWindow } from '@domain/value-objects/time-window.vo';
import { CapacityRange } from '@domain/value-objects/capacity-range.vo';
import { seedDatabase } from '@infrastructure/database/seed';
import { MongoDBClient } from '@infrastructure/database/mongodb.client';
import { Env } from '@infrastructure/config/env';
import { z } from 'zod';

interface AdminRoutesOptions {
  restaurantRepo: MongoDBRestaurantRepository;
  sectorRepo: MongoDBSectorRepository;
  tableRepo: MongoDBTableRepository;
  dbClient: MongoDBClient;
  config: Env;
}

const createRestaurantSchema = z.object({
  id: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  timezone: z.string(),
  windows: z
    .array(
      z.object({
        start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      })
    )
    .optional()
    .default([]),
});

const createSectorSchema = z.object({
  id: z.string().min(1).max(50),
  restaurantId: z.string().min(1),
  name: z.string().min(1).max(100),
});

const createTableSchema = z.object({
  id: z.string().min(1).max(50),
  sectorId: z.string().min(1),
  name: z.string().min(1).max(100),
  capacityMin: z.number().int().min(1).max(50),
  capacityMax: z.number().int().min(1).max(50),
});

const adminRoutes: FastifyPluginAsync<AdminRoutesOptions> = async (fastify, opts) => {
  // Simple admin secret check (can be improved with proper API keys)
  const adminSecret = process.env.ADMIN_SECRET || 'wokibrain-admin-secret-change-in-production';

  const checkAdminAuth = async (request: any, reply: any): Promise<void> => {
    const providedSecret = request.headers['x-admin-secret'] || request.query?.secret;
    if (providedSecret !== adminSecret) {
      return reply.code(401).send({
        error: 'UNAUTHORIZED',
        detail: 'Invalid admin secret. Provide X-Admin-Secret header or ?secret= query parameter.',
      });
    }
  };

  // Seed database with sample data
  fastify.post(
    '/seed',
    {
      schema: {
        description: 'Seed database with sample restaurant, sector, tables, and a booking',
        tags: ['Admin'],
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  restaurantId: { type: 'string' },
                  sectorId: { type: 'string' },
                  tableIds: { type: 'array', items: { type: 'string' } },
                  bookingId: { type: 'string' },
                },
              },
            },
          },
        },
      },
      preHandler: [checkAdminAuth],
    },
    async (request, reply) => {
      try {
        await seedDatabase(opts.dbClient);
        return reply.code(200).send({
          message: 'Database seeded successfully',
          data: {
            restaurantId: 'R1',
            sectorId: 'S1',
            tableIds: ['T1', 'T2', 'T3', 'T4', 'T5'],
            bookingId: 'B1',
          },
        });
      } catch (error: any) {
        return reply.code(500).send({
          error: 'SEED_ERROR',
          detail: error.message || 'Failed to seed database',
        });
      }
    }
  );

  // Create restaurant
  fastify.post(
    '/restaurants',
    {
      schema: {
        description: 'Create a new restaurant',
        tags: ['Admin'],
        body: {
          type: 'object',
          required: ['id', 'name', 'timezone'],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            timezone: { type: 'string' },
            windows: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  start: { type: 'string' },
                  end: { type: 'string' },
                },
              },
            },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              timezone: { type: 'string' },
              windows: { type: 'array' },
            },
          },
        },
      },
      preHandler: [checkAdminAuth],
    },
    async (request, reply) => {
      try {
        const body = createRestaurantSchema.parse(request.body);
        const now = new Date();

        const windows = (body.windows || []).map((w) => TimeWindow.create(w.start, w.end));
        const restaurant = Restaurant.create(
          body.id,
          body.name,
          Timezone.create(body.timezone),
          windows,
          now,
          now
        );

        await opts.restaurantRepo.save(restaurant);

        return reply.code(201).send({
          id: restaurant.id,
          name: restaurant.name,
          timezone: restaurant.timezone.value,
          windows: restaurant.windows.map((w) => ({
            start: w.start,
            end: w.end,
          })),
        });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'VALIDATION_ERROR',
            detail: 'Invalid input data',
            issues: error.errors,
          });
        }
        return reply.code(500).send({
          error: 'CREATE_ERROR',
          detail: error.message || 'Failed to create restaurant',
        });
      }
    }
  );

  // Create sector
  fastify.post(
    '/sectors',
    {
      schema: {
        description: 'Create a new sector within a restaurant',
        tags: ['Admin'],
        body: {
          type: 'object',
          required: ['id', 'restaurantId', 'name'],
          properties: {
            id: { type: 'string' },
            restaurantId: { type: 'string' },
            name: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              restaurantId: { type: 'string' },
              name: { type: 'string' },
            },
          },
        },
      },
      preHandler: [checkAdminAuth],
    },
    async (request, reply) => {
      try {
        const body = createSectorSchema.parse(request.body);
        const now = new Date();

        // Verify restaurant exists
        const restaurant = await opts.restaurantRepo.findById(body.restaurantId);
        if (!restaurant) {
          return reply.code(404).send({
            error: 'NOT_FOUND',
            detail: `Restaurant with id ${body.restaurantId} not found`,
          });
        }

        const sector = Sector.create(body.id, body.restaurantId, body.name, now, now);
        await opts.sectorRepo.save(sector);

        return reply.code(201).send({
          id: sector.id,
          restaurantId: sector.restaurantId,
          name: sector.name,
        });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'VALIDATION_ERROR',
            detail: 'Invalid input data',
            issues: error.errors,
          });
        }
        return reply.code(500).send({
          error: 'CREATE_ERROR',
          detail: error.message || 'Failed to create sector',
        });
      }
    }
  );

  // Create table
  fastify.post(
    '/tables',
    {
      schema: {
        description: 'Create a new table within a sector',
        tags: ['Admin'],
        body: {
          type: 'object',
          required: ['id', 'sectorId', 'name', 'capacityMin', 'capacityMax'],
          properties: {
            id: { type: 'string' },
            sectorId: { type: 'string' },
            name: { type: 'string' },
            capacityMin: { type: 'number' },
            capacityMax: { type: 'number' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              sectorId: { type: 'string' },
              name: { type: 'string' },
              capacity: {
                type: 'object',
                properties: {
                  min: { type: 'number' },
                  max: { type: 'number' },
                },
              },
            },
          },
        },
      },
      preHandler: [checkAdminAuth],
    },
    async (request, reply) => {
      try {
        const body = createTableSchema.parse(request.body);
        const now = new Date();

        // Verify sector exists
        const sector = await opts.sectorRepo.findById(body.sectorId);
        if (!sector) {
          return reply.code(404).send({
            error: 'NOT_FOUND',
            detail: `Sector with id ${body.sectorId} not found`,
          });
        }

        if (body.capacityMin > body.capacityMax) {
          return reply.code(400).send({
            error: 'VALIDATION_ERROR',
            detail: 'capacityMin must be <= capacityMax',
          });
        }

        const capacity = CapacityRange.create(body.capacityMin, body.capacityMax);
        const table = Table.create(body.id, body.sectorId, body.name, capacity, now, now);
        await opts.tableRepo.save(table);

        return reply.code(201).send({
          id: table.id,
          sectorId: table.sectorId,
          name: table.name,
          capacity: {
            min: table.capacity.min,
            max: table.capacity.max,
          },
        });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'VALIDATION_ERROR',
            detail: 'Invalid input data',
            issues: error.errors,
          });
        }
        return reply.code(500).send({
          error: 'CREATE_ERROR',
          detail: error.message || 'Failed to create table',
        });
      }
    }
  );

  // Get admin info (no auth required, just shows how to use)
  fastify.get(
    '/info',
    {
      schema: {
        description: 'Get information about admin endpoints',
        tags: ['Admin'],
      },
    },
    async (request, reply) => {
      return reply.code(200).send({
        message: 'WokiBrain Admin API',
        endpoints: {
          seed: {
            method: 'POST',
            path: '/api/v1/admin/seed',
            description: 'Seed database with sample data (R1, S1, T1-T5, B1)',
            auth: 'X-Admin-Secret header or ?secret= query parameter',
          },
          createRestaurant: {
            method: 'POST',
            path: '/api/v1/admin/restaurants',
            description: 'Create a new restaurant',
            auth: 'X-Admin-Secret header or ?secret= query parameter',
          },
          createSector: {
            method: 'POST',
            path: '/api/v1/admin/sectors',
            description: 'Create a new sector',
            auth: 'X-Admin-Secret header or ?secret= query parameter',
          },
          createTable: {
            method: 'POST',
            path: '/api/v1/admin/tables',
            description: 'Create a new table',
            auth: 'X-Admin-Secret header or ?secret= query parameter',
          },
        },
        note: 'Set ADMIN_SECRET environment variable to secure these endpoints. Default: wokibrain-admin-secret-change-in-production',
      });
    }
  );
};

export default adminRoutes;

