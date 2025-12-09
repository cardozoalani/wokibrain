import { Restaurant } from '../entities/restaurant.entity';

export interface RestaurantRepository {
  findById(id: string): Promise<Restaurant | null>;
  save(restaurant: Restaurant): Promise<void>;
}
