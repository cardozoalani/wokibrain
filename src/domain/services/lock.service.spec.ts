import { describe, it, expect } from 'vitest';
import { LockService } from './lock.service';

describe('LockService', () => {
  let lockService: LockService;

  beforeEach(() => {
    lockService = new LockService();
  });

  describe('acquire', () => {
    it('should execute function with lock', async () => {
      const fn = vi.fn().mockResolvedValue('result');

      const result = await lockService.acquire('test-key', fn);

      expect(result).toBe('result');
      expect(fn).toHaveBeenCalled();
    });

    it('should prevent concurrent execution with same key', async () => {
      let executionOrder: string[] = [];
      const fn1 = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            executionOrder.push('fn1-start');
            setTimeout(() => {
              executionOrder.push('fn1-end');
              resolve('result1');
            }, 50);
          })
      );

      const fn2 = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            executionOrder.push('fn2-start');
            setTimeout(() => {
              executionOrder.push('fn2-end');
              resolve('result2');
            }, 10);
          })
      );

      const promise1 = lockService.acquire('test-key', fn1);
      const promise2 = lockService.acquire('test-key', fn2);

      await Promise.all([promise1, promise2]);

      expect(executionOrder).toEqual(['fn1-start', 'fn1-end', 'fn2-start', 'fn2-end']);
    });

    it('should allow concurrent execution with different keys', async () => {
      const fn1 = vi.fn().mockResolvedValue('result1');
      const fn2 = vi.fn().mockResolvedValue('result2');

      const [result1, result2] = await Promise.all([
        lockService.acquire('key1', fn1),
        lockService.acquire('key2', fn2),
      ]);

      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
    });
  });

  describe('generateLockKey', () => {
    it('should generate lock key', () => {
      const key = lockService.generateLockKey('R1', 'S1', ['T1', 'T2'], new Date('2025-10-22T20:00:00'));

      expect(key).toContain('R1');
      expect(key).toContain('S1');
      expect(key).toContain('T1+T2');
    });

    it('should sort table IDs in lock key', () => {
      const key1 = lockService.generateLockKey('R1', 'S1', ['T2', 'T1'], new Date('2025-10-22T20:00:00'));
      const key2 = lockService.generateLockKey('R1', 'S1', ['T1', 'T2'], new Date('2025-10-22T20:00:00'));

      expect(key1).toBe(key2);
    });
  });
});



