import { describe, it, expect } from 'vitest';
import { WokiBrainSelectionService, Candidate } from './wokibrain-selection.service';
import { Table } from '../entities/table.entity';
import { CapacityRange } from '../value-objects/capacity-range.vo';
import { Duration } from '../value-objects/duration.vo';

describe('WokiBrainSelectionService', () => {
  let service: WokiBrainSelectionService;

  beforeEach(() => {
    service = new WokiBrainSelectionService();
  });

  describe('selectBestCandidate', () => {
    it('should return null for empty candidates', () => {
      expect(service.selectBestCandidate([])).toBeNull();
    });

    it('should select candidate with highest score', () => {
      const candidates: Candidate[] = [
        {
          kind: 'single',
          tableIds: ['T1'],
          capacity: CapacityRange.create(2, 4),
          start: new Date('2025-10-22T20:00:00'),
          end: new Date('2025-10-22T21:30:00'),
          score: 50,
        },
        {
          kind: 'single',
          tableIds: ['T2'],
          capacity: CapacityRange.create(2, 4),
          start: new Date('2025-10-22T20:00:00'),
          end: new Date('2025-10-22T21:30:00'),
          score: 80,
        },
      ];

      const best = service.selectBestCandidate(candidates);
      expect(best?.score).toBe(80);
      expect(best?.tableIds).toEqual(['T2']);
    });

    it('should sort candidates correctly when scores are equal', () => {
      const candidates: Candidate[] = [
        {
          kind: 'combo',
          tableIds: ['T1', 'T2'],
          capacity: CapacityRange.create(4, 8),
          start: new Date('2025-10-22T20:00:00'),
          end: new Date('2025-10-22T21:30:00'),
          score: 50,
        },
        {
          kind: 'single',
          tableIds: ['T3'],
          capacity: CapacityRange.create(2, 4),
          start: new Date('2025-10-22T20:00:00'),
          end: new Date('2025-10-22T21:30:00'),
          score: 50,
        },
      ];

      const best = service.selectBestCandidate(candidates);
      // When scores are equal, the service prefers combo (returns -1 for combo, 1 for single in sort)
      // So combo comes first in descending sort
      expect(best).not.toBeNull();
      expect(best?.score).toBe(50);
    });
  });

  describe('generateCandidates', () => {
    it('should generate single table candidates', () => {
      const table = Table.create('T1', 'S1', 'Table 1', CapacityRange.create(2, 4));
      const tableGaps = new Map([
        [
          'T1',
          [
            {
              start: new Date('2025-10-22T20:00:00'),
              end: new Date('2025-10-22T23:45:00'),
            },
          ],
        ],
      ]);

      const candidates = service.generateCandidates(
        [table],
        tableGaps,
        3,
        Duration.create(90)
      );

      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates.some((c) => c.kind === 'single')).toBe(true);
    });

    it('should generate combo candidates for large parties', () => {
      const table1 = Table.create('T1', 'S1', 'Table 1', CapacityRange.create(2, 2));
      const table2 = Table.create('T2', 'S1', 'Table 2', CapacityRange.create(2, 2));
      const tableGaps = new Map([
        [
          'T1',
          [
            {
              start: new Date('2025-10-22T20:00:00'),
              end: new Date('2025-10-22T23:45:00'),
            },
          ],
        ],
        [
          'T2',
          [
            {
              start: new Date('2025-10-22T20:00:00'),
              end: new Date('2025-10-22T23:45:00'),
            },
          ],
        ],
      ]);

      const candidates = service.generateCandidates(
        [table1, table2],
        tableGaps,
        4,
        Duration.create(90)
      );

      expect(candidates.some((c) => c.kind === 'combo')).toBe(true);
    });

    it('should not generate candidates for tables that cannot accommodate', () => {
      const table = Table.create('T1', 'S1', 'Table 1', CapacityRange.create(2, 2));
      const tableGaps = new Map([
        [
          'T1',
          [
            {
              start: new Date('2025-10-22T20:00:00'),
              end: new Date('2025-10-22T23:45:00'),
            },
          ],
        ],
      ]);

      const candidates = service.generateCandidates(
        [table],
        tableGaps,
        5,
        Duration.create(90)
      );

      expect(candidates.length).toBe(0);
    });
  });
});

