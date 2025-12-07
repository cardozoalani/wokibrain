import { describe, it, expect } from 'vitest';
import { Restaurant } from './restaurant.entity';
import { Timezone } from '../value-objects/timezone.vo';
import { TimeWindow } from '../value-objects/time-window.vo';

describe('Restaurant', () => {
  it('should create restaurant', () => {
    const restaurant = Restaurant.create(
      'R1',
      'Bistro Central',
      Timezone.create('America/Argentina/Buenos_Aires')
    );

    expect(restaurant.id).toBe('R1');
    expect(restaurant.name).toBe('Bistro Central');
    expect(restaurant.timezone.value).toBe('America/Argentina/Buenos_Aires');
  });

  it('should create restaurant with service windows', () => {
    const windows = [
      TimeWindow.create('12:00', '16:00'),
      TimeWindow.create('20:00', '23:45'),
    ];

    const restaurant = Restaurant.create(
      'R1',
      'Bistro Central',
      Timezone.create('America/Argentina/Buenos_Aires'),
      windows
    );

    expect(restaurant.windows).toHaveLength(2);
    expect(restaurant.hasServiceWindows()).toBe(true);
  });

  it('should check if time is within service window', () => {
    const windows = [TimeWindow.create('20:00', '23:45')];
    const restaurant = Restaurant.create(
      'R1',
      'Bistro Central',
      Timezone.create('America/Argentina/Buenos_Aires'),
      windows
    );

    expect(restaurant.isWithinServiceWindow('20:00')).toBe(true);
    expect(restaurant.isWithinServiceWindow('21:30')).toBe(true);
    expect(restaurant.isWithinServiceWindow('23:44')).toBe(true);
    expect(restaurant.isWithinServiceWindow('19:59')).toBe(false);
    expect(restaurant.isWithinServiceWindow('23:45')).toBe(false);
  });

  it('should return true for any time when no service windows', () => {
    const restaurant = Restaurant.create(
      'R1',
      'Bistro Central',
      Timezone.create('America/Argentina/Buenos_Aires')
    );

    expect(restaurant.hasServiceWindows()).toBe(false);
    expect(restaurant.isWithinServiceWindow('00:00')).toBe(true);
    expect(restaurant.isWithinServiceWindow('23:59')).toBe(true);
  });
});



