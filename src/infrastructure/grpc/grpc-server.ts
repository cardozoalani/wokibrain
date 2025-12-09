import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { join } from 'path';
import { CommandBus } from '@application/cqrs/command';
import { QueryBus } from '@application/cqrs/query';
import { Logger } from '@application/ports/logger.port';
import { CreateBookingCommand } from '@application/commands/create-booking.command';
import { GetBookingQuery } from '@application/queries/get-booking.query';
import { ListBookingsQuery } from '@application/queries/list-bookings.query';
import { ListBookingsOutput } from '@application/dtos/list-bookings.dto';
import { DiscoverSeatsQuery } from '@application/queries/discover-seats.query';

export class GrpcServer {
  private server: grpc.Server;
  private readonly protoPath = join(__dirname, 'booking.proto');

  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
    private logger: Logger
  ) {
    this.server = new grpc.Server({
      'grpc.max_receive_message_length': 10 * 1024 * 1024,
      'grpc.max_send_message_length': 10 * 1024 * 1024,
    });

    this.loadProtos();
  }

  private loadProtos(): void {
    const packageDefinition = protoLoader.loadSync(this.protoPath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });

    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;

    this.server.addService(protoDescriptor.wokibrain.BookingService.service, {
      CreateBooking: this.handleCreateBooking.bind(this),
      GetBooking: this.handleGetBooking.bind(this),
      CancelBooking: this.handleCancelBooking.bind(this),
      ListBookings: this.handleListBookings.bind(this),
      DiscoverSeats: this.handleDiscoverSeats.bind(this),
      StreamBookings: this.handleStreamBookings.bind(this),
    });
  }

  private async handleCreateBooking(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ): Promise<void> {
    try {
      const command = new CreateBookingCommand({
        restaurantId: call.request.restaurant_id,
        sectorId: call.request.sector_id,
        partySize: call.request.party_size,
        durationMinutes: call.request.duration_minutes,
        date: call.request.date,
        windowStart: call.request.window_start,
        windowEnd: call.request.window_end,
        guestName: call.request.guest_name,
        guestEmail: call.request.guest_email,
        guestPhone: call.request.guest_phone,
      });

      const result = await this.commandBus.execute(command);
      callback(null, this.toGrpcBooking(result));
    } catch (error) {
      this.logger.error('gRPC CreateBooking error', error as Error);
      callback({
        code: grpc.status.INTERNAL,
        message: (error as Error).message,
      });
    }
  }

  private async handleGetBooking(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ): Promise<void> {
    try {
      const query = new GetBookingQuery(call.request.booking_id);
      const result = await this.queryBus.execute(query);
      callback(null, this.toGrpcBooking(result));
    } catch (error) {
      callback({
        code: grpc.status.NOT_FOUND,
        message: (error as Error).message,
      });
    }
  }

  private async handleCancelBooking(
    _call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ): Promise<void> {
    try {
      callback(null, { success: true, message: 'Booking cancelled' });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        message: (error as Error).message,
      });
    }
  }

  private async handleListBookings(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ): Promise<void> {
    try {
      const query = new ListBookingsQuery({
        restaurantId: call.request.restaurant_id,
        sectorId: call.request.sector_id,
        date: call.request.date,
        status: call.request.status,
        page: call.request.page,
        limit: call.request.limit,
      });

      const result = (await this.queryBus.execute(query)) as ListBookingsOutput;
      const bookings = Array.isArray(result?.bookings) ? result.bookings : [];
      callback(null, {
        bookings: bookings.map((b: any) => this.toGrpcBooking(b)),
        total: bookings.length,
        page: call.request.page || 1,
        limit: call.request.limit || 50,
      });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        message: (error as Error).message,
      });
    }
  }

  private async handleDiscoverSeats(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ): Promise<void> {
    try {
      const query = new DiscoverSeatsQuery({
        restaurantId: call.request.restaurant_id,
        sectorId: call.request.sector_id,
        date: call.request.date,
        partySize: call.request.party_size,
        duration: call.request.duration,
        windowStart: call.request.window_start,
        windowEnd: call.request.window_end,
        limit: call.request.limit,
      });

      const result = await this.queryBus.execute(query);
      callback(null, result);
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        message: (error as Error).message,
      });
    }
  }

  private handleStreamBookings(call: grpc.ServerWritableStream<any, any>): void {
    const interval = setInterval(() => {
      call.write({
        event_type: 'BookingCreated',
        booking: {},
        occurred_at: new Date().toISOString(),
      });
    }, 5000);

    call.on('cancelled', () => {
      clearInterval(interval);
      call.end();
    });
  }

  private toGrpcBooking(booking: any): any {
    return {
      id: booking.id,
      restaurant_id: booking.restaurantId,
      sector_id: booking.sectorId,
      table_ids: booking.tableIds,
      party_size: booking.partySize,
      start: booking.start,
      end: booking.end,
      duration_minutes: booking.durationMinutes,
      status: booking.status,
      guest_name: booking.guestName,
      guest_email: booking.guestEmail,
      guest_phone: booking.guestPhone,
      created_at: booking.createdAt,
      updated_at: booking.updatedAt,
    };
  }

  async start(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.bindAsync(
        `0.0.0.0:${port}`,
        grpc.ServerCredentials.createInsecure(),
        (error, boundPort) => {
          if (error) {
            reject(error);
            return;
          }

          this.server.start();
          this.logger.info('gRPC server started', { port: boundPort });
          resolve();
        }
      );
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.tryShutdown(() => {
        this.logger.info('gRPC server stopped');
        resolve();
      });
    });
  }
}
