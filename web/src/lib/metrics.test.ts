import { describe, expect, it } from 'vitest';
import { bufferAheadSeconds, bufferingRatio, formatKbps } from './metrics';

describe('bufferingRatio', () => {
  it('is zero when nothing was played', () => {
    expect(bufferingRatio(0, 0)).toBe(0);
  });

  it('is the stalled share of the session', () => {
    expect(bufferingRatio(9_000, 18_000)).toBeCloseTo(1 / 3);
  });

  it('is one when the session was all stall', () => {
    expect(bufferingRatio(5_000, 0)).toBe(1);
  });
});

describe('bufferAheadSeconds', () => {
  const ranges = [
    { start: 0, end: 12 },
    { start: 20, end: 24 },
  ];

  it('measures the range that contains the playhead', () => {
    expect(bufferAheadSeconds(ranges, 5)).toBe(7);
    expect(bufferAheadSeconds(ranges, 21)).toBe(3);
  });

  it('is zero in a gap', () => {
    expect(bufferAheadSeconds(ranges, 15)).toBe(0);
  });

  it('is zero without ranges', () => {
    expect(bufferAheadSeconds([], 0)).toBe(0);
  });
});

describe('formatKbps', () => {
  it('uses Mbit/s from 1000 kbit/s', () => {
    expect(formatKbps(2500)).toBe('2.50 Mbit/s');
    expect(formatKbps(640)).toBe('640 kbit/s');
  });
});
