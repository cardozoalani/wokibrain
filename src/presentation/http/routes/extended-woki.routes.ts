import { FastifyPluginAsync } from 'fastify';
import { GetBookingUseCase } from '@application/use-cases/get-booking.use-case';
import { DeleteBookingUseCase } from '@application/use-cases/delete-booking.use-case';

interface ExtendedWokiRoutesOptions {
  getBookingUseCase: GetBookingUseCase;
  deleteBookingUseCase: DeleteBookingUseCase;
}

const extendedWokiRoutes: FastifyPluginAsync<ExtendedWokiRoutesOptions> = async (
  fastify,
  opts
) => {
  fastify.get(
    '/bookings/:bookingId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['bookingId'],
          properties: {
            bookingId: { type: 'string' },
          },
        },
        response: {
          200: {
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
      const { bookingId } = request.params as { bookingId: string };
      const result = await opts.getBookingUseCase.execute(bookingId);
      return reply.code(200).send(result);
    }
  );

  fastify.delete(
    '/bookings/:bookingId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['bookingId'],
          properties: {
            bookingId: { type: 'string' },
          },
        },
        headers: {
          type: 'object',
          properties: {
            'idempotency-key': { type: 'string' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Booking cancelled successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const { bookingId } = request.params as { bookingId: string };
      await opts.deleteBookingUseCase.execute(bookingId);
      return reply.code(204).send();
    }
  );
};

export default extendedWokiRoutes;



