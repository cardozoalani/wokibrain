import { Table } from '../entities/table.entity';
import { CapacityRange } from '../value-objects/capacity-range.vo';
import { Duration } from '../value-objects/duration.vo';

export interface Candidate {
  kind: 'single' | 'combo';
  tableIds: string[];
  capacity: CapacityRange;
  start: Date;
  end: Date;
  score: number;
}

interface Gap {
  start: Date;
  end: Date;
}

export class WokiBrainSelectionService {
  selectBestCandidate(candidates: Candidate[]): Candidate | null {
    if (candidates.length === 0) return null;

    const sorted = [...candidates].sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      
      if (a.kind !== b.kind) {
        return a.kind === 'single' ? 1 : -1;
      }

      if (a.start.getTime() !== b.start.getTime()) {
        return a.start.getTime() - b.start.getTime();
      }

      return a.tableIds.length - b.tableIds.length;
    });

    return sorted[0];
  }

  generateCandidates(
    tables: Table[],
    tableGaps: Map<string, Gap[]>,
    partySize: number,
    duration: Duration
  ): Candidate[] {
    const candidates: Candidate[] = [];

    for (const table of tables) {
      const gaps = tableGaps.get(table.id) || [];
      const singleCandidates = this.createSingleTableCandidates(
        table,
        gaps,
        partySize,
        duration
      );
      candidates.push(...singleCandidates);
    }

    const comboCandidates = this.createComboCandidates(
      tables,
      tableGaps,
      partySize,
      duration
    );
    candidates.push(...comboCandidates);

    return candidates;
  }

  private createSingleTableCandidates(
    table: Table,
    gaps: Gap[],
    partySize: number,
    duration: Duration
  ): Candidate[] {
    if (!table.canAccommodate(partySize)) return [];

    const candidates: Candidate[] = [];

    for (const gap of gaps) {
      const slots = this.findSlotsInGap(gap, duration);
      for (const slot of slots) {
        candidates.push({
          kind: 'single',
          tableIds: [table.id],
          capacity: table.capacity,
          start: slot.start,
          end: slot.end,
          score: this.calculateScore(table.capacity, partySize, 'single'),
        });
      }
    }

    return candidates;
  }

  private createComboCandidates(
    tables: Table[],
    tableGaps: Map<string, Gap[]>,
    partySize: number,
    duration: Duration
  ): Candidate[] {
    const candidates: Candidate[] = [];
    const maxComboSize = Math.min(4, tables.length);

    for (let size = 2; size <= maxComboSize; size++) {
      const combinations = this.generateCombinations(tables, size);

      for (const combo of combinations) {
        const capacity = this.calculateComboCapacity(combo);
        if (!capacity.canAccommodate(partySize)) continue;

        const gaps = combo.map((t) => tableGaps.get(t.id) || []);
        const comboGaps = this.intersectAllGaps(gaps);

        for (const gap of comboGaps) {
          const slots = this.findSlotsInGap(gap, duration);
          for (const slot of slots) {
            candidates.push({
              kind: 'combo',
              tableIds: combo.map((t) => t.id),
              capacity,
              start: slot.start,
              end: slot.end,
              score: this.calculateScore(capacity, partySize, 'combo'),
            });
          }
        }
      }
    }

    return candidates;
  }

  private calculateComboCapacity(tables: Table[]): CapacityRange {
    let totalMin = 0;
    let totalMax = 0;

    for (const table of tables) {
      totalMin += table.capacity.min;
      totalMax += table.capacity.max;
    }

    return CapacityRange.create(totalMin, totalMax);
  }

  private findSlotsInGap(gap: Gap, duration: Duration): Array<{ start: Date; end: Date }> {
    const slots: Array<{ start: Date; end: Date }> = [];
    const gapDuration = (gap.end.getTime() - gap.start.getTime()) / (1000 * 60);

    if (gapDuration < duration.minutes) return slots;

    let current = new Date(gap.start);
    const maxStart = new Date(gap.end.getTime() - duration.minutes * 60 * 1000);

    while (current <= maxStart) {
      const end = duration.addTo(current);
      if (end <= gap.end) {
        slots.push({ start: new Date(current), end });
      }
      current = new Date(current.getTime() + 15 * 60 * 1000);
    }

    return slots;
  }

  private calculateScore(capacity: CapacityRange, partySize: number, kind: string): number {
    const utilization = partySize / capacity.max;
    const kindBonus = kind === 'single' ? 20 : 0;
    const perfectFit = partySize === capacity.max ? 30 : 0;

    return utilization * 50 + kindBonus + perfectFit;
  }

  private generateCombinations<T>(items: T[], size: number): T[][] {
    if (size === 1) return items.map((item) => [item]);
    if (size === items.length) return [items];

    const result: T[][] = [];

    const helper = (start: number, current: T[]): void => {
      if (current.length === size) {
        result.push([...current]);
        return;
      }

      for (let i = start; i < items.length; i++) {
        current.push(items[i]);
        helper(i + 1, current);
        current.pop();
      }
    };

    helper(0, []);
    return result;
  }

  private intersectAllGaps(gapArrays: Gap[][]): Gap[] {
    if (gapArrays.length === 0) return [];
    if (gapArrays.length === 1) return gapArrays[0];

    let result = gapArrays[0];

    for (let i = 1; i < gapArrays.length; i++) {
      result = this.intersectTwoGapArrays(result, gapArrays[i]);
      if (result.length === 0) break;
    }

    return result;
  }

  private intersectTwoGapArrays(gaps1: Gap[], gaps2: Gap[]): Gap[] {
    const result: Gap[] = [];

    for (const g1 of gaps1) {
      for (const g2 of gaps2) {
        const start = new Date(Math.max(g1.start.getTime(), g2.start.getTime()));
        const end = new Date(Math.min(g1.end.getTime(), g2.end.getTime()));

        if (start < end) {
          result.push({ start, end });
        }
      }
    }

    return result;
  }
}



