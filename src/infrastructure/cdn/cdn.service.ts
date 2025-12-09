import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';

export interface InvalidationOptions {
  paths: string[];
  callerReference?: string;
}

export class CDNService {
  private cloudfront: CloudFrontClient;
  private distributionId: string;

  constructor(distributionId: string, region: string = 'us-east-1') {
    this.distributionId = distributionId;
    this.cloudfront = new CloudFrontClient({ region });
  }

  /**
   * Invalidate specific paths in CloudFront cache
   */
  async invalidate(options: InvalidationOptions): Promise<string> {
    const { paths, callerReference } = options;

    const command = new CreateInvalidationCommand({
      DistributionId: this.distributionId,
      InvalidationBatch: {
        CallerReference:
          callerReference ||
          `invalidation-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        Paths: {
          Quantity: paths.length,
          Items: paths,
        },
      },
    });

    const response = await this.cloudfront.send(command);
    return response.Invalidation?.Id || '';
  }

  /**
   * Invalidate all paths (use with caution)
   */
  async invalidateAll(): Promise<string> {
    return this.invalidate({ paths: ['/*'] });
  }

  /**
   * Invalidate discovery cache for a specific restaurant/sector/date
   */
  async invalidateDiscovery(
    restaurantId: string,
    sectorId?: string,
    date?: string
  ): Promise<string> {
    const paths: string[] = [];

    if (sectorId && date) {
      paths.push(
        `/api/v1/woki/discover?restaurantId=${restaurantId}&sectorId=${sectorId}&date=${date}*`
      );
      paths.push(`/api/v1/woki/discover?restaurantId=${restaurantId}&date=${date}*`);
    } else if (date) {
      paths.push(`/api/v1/woki/discover?restaurantId=${restaurantId}&date=${date}*`);
    } else {
      paths.push(`/api/v1/woki/discover?restaurantId=${restaurantId}*`);
    }

    return this.invalidate({ paths });
  }

  /**
   * Invalidate restaurant data cache
   */
  async invalidateRestaurant(restaurantId: string): Promise<string> {
    return this.invalidate({
      paths: [
        `/api/v1/restaurants/${restaurantId}`,
        `/api/v1/restaurants/${restaurantId}/*`,
        `/api/v1/restaurants/${restaurantId}/sectors`,
        `/api/v1/restaurants/${restaurantId}/sectors/*`,
      ],
    });
  }

  /**
   * Invalidate booking-related cache
   */
  async invalidateBookings(
    restaurantId: string,
    sectorId?: string,
    date?: string
  ): Promise<string> {
    const paths: string[] = [];

    if (sectorId && date) {
      paths.push(
        `/api/v1/woki/bookings?restaurantId=${restaurantId}&sectorId=${sectorId}&date=${date}*`
      );
    } else if (date) {
      paths.push(`/api/v1/woki/bookings?restaurantId=${restaurantId}&date=${date}*`);
    } else {
      paths.push(`/api/v1/woki/bookings?restaurantId=${restaurantId}*`);
    }

    return this.invalidate({ paths });
  }
}
