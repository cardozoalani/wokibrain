import { describe, it, expect } from 'vitest';
import { Timezone } from './timezone.vo';
import { ValidationError } from '@shared/errors';

describe('Timezone', () => {
  it('should create valid timezone', () => {
    const timezone = Timezone.create('America/Argentina/Buenos_Aires');
    expect(timezone.value).toBe('America/Argentina/Buenos_Aires');
  });

  it('should throw error for empty timezone', () => {
    expect(() => Timezone.create('')).toThrow(ValidationError);
    expect(() => Timezone.create('   ')).toThrow(ValidationError);
  });

  it('should throw error for invalid timezone', () => {
    expect(() => Timezone.create('Invalid/Timezone')).toThrow(ValidationError);
  });

  it('should convert date to zoned date', () => {
    const timezone = Timezone.create('America/Argentina/Buenos_Aires');
    const date = new Date('2025-10-22T20:00:00Z');
    const zonedDate = timezone.toZonedDate(date);
    expect(zonedDate).toBeInstanceOf(Date);
  });
});



