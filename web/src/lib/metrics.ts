// Pure functions for the QoE metrics (Dobrian et al., SIGCOMM 2011).
// They are kept free of DOM and hls.js so they can be unit tested.

export interface RunSummary {
  /** Time from the start of the session to the first frame, in ms. Null if playback never started. */
  joinTimeMs: number | null;
  /** Number of rebuffering events after playback started. */
  stalls: number;
  /** Total time spent stalled, in ms. */
  stallMs: number;
  /** Total time spent playing, in ms. */
  playMs: number;
  /** Stalled time divided by (stalled + playing) time, from 0 to 1. */
  bufferingRatio: number;
  /** Average bitrate weighted by the time spent in each level, in kbit/s. */
  avgBitrateKbps: number;
}

/** Buffering ratio: stalled time over total session time (playing + stalled). */
export function bufferingRatio(stallMs: number, playMs: number): number {
  const total = stallMs + playMs;
  return total > 0 ? stallMs / total : 0;
}

/** Rebuffering events per minute of session. */
export function rebufferRate(stalls: number, stallMs: number, playMs: number): number {
  const minutes = (stallMs + playMs) / 60_000;
  return minutes > 0 ? stalls / minutes : 0;
}

/** Average bitrate weighted by the time spent at each bitrate. */
export function weightedBitrateKbps(timeByBitrate: ReadonlyMap<number, number>): number {
  let weighted = 0;
  let total = 0;
  for (const [kbps, ms] of timeByBitrate) {
    weighted += kbps * ms;
    total += ms;
  }
  return total > 0 ? weighted / total : 0;
}

/** Seconds of video buffered ahead of the playhead. */
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
