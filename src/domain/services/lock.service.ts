export class LockService {
  private locks: Map<string, Promise<void>> = new Map();

  async acquire<T>(key: string, fn: () => Promise<T>): Promise<T> {
    while (this.locks.has(key)) {
      await this.locks.get(key);
    }

    let release: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      release = resolve;
    });

    this.locks.set(key, lockPromise);

    try {
      return await fn();
    } finally {
      this.locks.delete(key);
      release!();
    }
  }

  generateLockKey(
    restaurantId: string,
    sectorId: string,
    tableIds: string[],
    start: Date
  ): string {
    const sortedTables = [...tableIds].sort().join('+');
    const timestamp = start.toISOString();
    return `${restaurantId}|${sectorId}|${sortedTables}|${timestamp}`;
  }
}



