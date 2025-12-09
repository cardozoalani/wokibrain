export class LockService {
  private locks: Map<string, Promise<void>> = new Map();

  async acquire<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Validate input parameters
    if (!key || typeof key !== 'string' || key.trim().length === 0) {
      throw new Error('Lock key must be a non-empty string');
    }
    if (typeof fn !== 'function') {
      throw new Error('Function parameter is required');
    }

    const trimmedKey = key.trim();
    while (this.locks.has(trimmedKey)) {
      await this.locks.get(trimmedKey);
    }

    let release: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      release = resolve;
    });

    this.locks.set(trimmedKey, lockPromise);

    try {
      return await fn();
    } catch (error) {
      // Re-throw the error to maintain error propagation
      throw error;
    } finally {
      this.locks.delete(trimmedKey);
      release!();
    }
  }

  generateLockKey(
    restaurantId: string,
    sectorId: string,
    tableIds: string[],
    start: Date
  ): string {
    // Validate input parameters
    if (!restaurantId || typeof restaurantId !== 'string') {
      throw new Error('Restaurant ID must be a non-empty string');
    }
    if (!sectorId || typeof sectorId !== 'string') {
      throw new Error('Sector ID must be a non-empty string');
    }
    if (!Array.isArray(tableIds)) {
      throw new Error('Table IDs must be an array');
    }
    if (!(start instanceof Date) || isNaN(start.getTime())) {
      throw new Error('Start date must be a valid Date object');
    }

    const sortedTables = [...tableIds].sort().join('+');
    const timestamp = start.toISOString();
    return `${restaurantId}|${sectorId}|${sortedTables}|${timestamp}`;
  }
}



