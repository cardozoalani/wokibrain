import { Booking } from '../entities/booking.entity';
import { TimeWindow } from '../value-objects/time-window.vo';
import { Timezone } from '../value-objects/timezone.vo';

interface Gap {
  start: Date;
  end: Date;
}

export class GapDiscoveryService {
  findGapsForTable(
    bookings: Booking[],
    date: Date,
    timezone: Timezone,
    serviceWindow: TimeWindow | null
  ): Gap[] {
    const confirmedBookings = bookings
      .filter((b) => b.isConfirmed())
      .map((b) => ({
        start: b.interval.start,
        end: b.interval.end,
      }))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    const windowStart = this.getWindowStart(date, serviceWindow, timezone);
    const windowEnd = this.getWindowEnd(date, serviceWindow, timezone);

    const sentinels = [
      { start: new Date(0), end: windowStart },
      { start: windowEnd, end: new Date(9999, 11, 31) },
    ];

    const allIntervals = [...sentinels, ...confirmedBookings];
    const gaps: Gap[] = [];

    for (let i = 0; i < allIntervals.length - 1; i++) {
      const prevEnd = allIntervals[i].end;
      const nextStart = allIntervals[i + 1].start;

      if (prevEnd < nextStart) {
        gaps.push({ start: prevEnd, end: nextStart });
      }
    }

    return gaps.filter((gap) => this.isValidGap(gap, windowStart, windowEnd));
  }

  findComboGaps(tableGaps: Gap[][]): Gap[] {
    if (tableGaps.length === 0) return [];
    if (tableGaps.length === 1) return tableGaps[0];

    let intersection = tableGaps[0];

    for (let i = 1; i < tableGaps.length; i++) {
      intersection = this.intersectGaps(intersection, tableGaps[i]);
      if (intersection.length === 0) break;
    }

    return intersection;
  }

  private intersectGaps(gaps1: Gap[], gaps2: Gap[]): Gap[] {
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

  private getWindowStart(date: Date, window: TimeWindow | null, _timezone: Timezone): Date {
    if (!window) {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
    }

    const [hours, minutes] = window.start.split(':').map(Number);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0);
  }

  private getWindowEnd(date: Date, window: TimeWindow | null, _timezone: Timezone): Date {
    if (!window) {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
    }

    const [hours, minutes] = window.end.split(':').map(Number);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0);
  }

  private isValidGap(gap: Gap, windowStart: Date, windowEnd: Date): boolean {
    return gap.start >= windowStart && gap.end <= windowEnd && gap.start < gap.end;
  }
}

