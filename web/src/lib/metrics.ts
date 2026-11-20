
export interface RunSummary {
  joinTimeMs: number | null;
  stalls: number;
  stallMs: number;
  playMs: number;
  bufferingRatio: number;
}

export function bufferingRatio(stallMs: number, playMs: number): number {
  const total = stallMs + playMs;
  return total > 0 ? stallMs / total : 0;
}

export function bufferAheadSeconds(ranges: { start: number; end: number }[], currentTime: number): number {
  for (const range of ranges) {
    if (currentTime >= range.start - 0.1 && currentTime <= range.end) {
      return Math.max(0, range.end - currentTime);
    }
  }
  return 0;
}

export function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

export function formatSeconds(ms: number | null): string {
  return ms === null ? '—' : `${(ms / 1000).toFixed(1)} s`;
}

export function formatKbps(kbps: number): string {
  return kbps >= 1000 ? `${(kbps / 1000).toFixed(2)} Mbit/s` : `${Math.round(kbps)} kbit/s`;
}
