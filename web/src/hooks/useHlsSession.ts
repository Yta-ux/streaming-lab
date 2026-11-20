import { useEffect, useState, type RefObject } from 'react';
import Hls from 'hls.js';
import {
  bufferAheadSeconds,
  bufferingRatio,
  type RunSummary,
} from '../lib/metrics';

export type Phase = 'idle' | 'joining' | 'playing' | 'stalled' | 'ended' | 'error';

export interface LevelInfo {
  index: number;
  name: string;
  bitrateKbps: number;
}

export interface ChartPoint {
  t: number;
  buffer: number;
  stalled: boolean;
}

export interface LevelSwitch {
  t: number;
  level: number;
}

export interface SessionState {
  phase: Phase;
  error: string | null;
  levels: LevelInfo[];
  currentLevel: number;
  bufferSeconds: number;
  estimateKbps: number;
  position: number;
  duration: number;
  points: ChartPoint[];
  switches: LevelSwitch[];
  summary: RunSummary;
}

export interface SessionOptions {
  abr: boolean;
  fixedLevel: number;
  runKey: number;
}

const MASTER_URL = '/media/master.m3u8';
const TICK_MS = 250;
const MAX_POINTS = 240;
const MAX_BUFFER_S = 30;

const EMPTY_SUMMARY: RunSummary = {
  joinTimeMs: null,
  stalls: 0,
  stallMs: 0,
  playMs: 0,
  bufferingRatio: 0,
};

const INITIAL_STATE: SessionState = {
  phase: 'idle',
  error: null,
  levels: [],
  currentLevel: -1,
  bufferSeconds: 0,
  estimateKbps: 0,
  position: 0,
  duration: 0,
  points: [],
  switches: [],
  summary: EMPTY_SUMMARY,
};

export function useHlsSession(videoRef: RefObject<HTMLVideoElement>, options: SessionOptions) {
  const [state, setState] = useState<SessionState>(INITIAL_STATE);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!Hls.isSupported()) {
      setState({ ...INITIAL_STATE, phase: 'error', error: 'Este navegador não suporta Media Source Extensions.' });
      return;
    }

    const { abr, fixedLevel } = options;

    const startedAt = performance.now();
    let lastTick = startedAt;
    let phase: Phase = 'joining';
    let error: string | null = null;
    let joinTimeMs: number | null = null;
    let stalls = 0;
    let stallMs = 0;
    let playMs = 0;
    let points: ChartPoint[] = [];
    let switches: LevelSwitch[] = [];
    let levels: LevelInfo[] = [];

    const hls = new Hls({
      maxBufferLength: MAX_BUFFER_S,
      maxMaxBufferLength: MAX_BUFFER_S,
      backBufferLength: 10,
      // ABR starts at the lowest quality and climbs as the throughput allows, like a real
      // player. Letting hls.js guess would jump straight to 720p on a fast local server.
      startLevel: abr ? 0 : fixedLevel,
    });

    const summary = (): RunSummary => ({
      joinTimeMs,
      stalls,
      stallMs,
      playMs,
      bufferingRatio: bufferingRatio(stallMs, playMs),
    });

    const currentLevelIndex = () => (hls.currentLevel >= 0 ? hls.currentLevel : hls.loadLevel);

    const onPlaying = () => {
      if (phase === 'joining') joinTimeMs = performance.now() - startedAt;
      if (phase === 'joining' || phase === 'stalled') phase = 'playing';
    };
    const onWaiting = () => {
      if (phase !== 'playing') return;
      phase = 'stalled';
      stalls += 1;
    };
    const onEnded = () => {
      phase = 'ended';
    };

    const tick = () => {
      const now = performance.now();
      const dt = now - lastTick;
      lastTick = now;

      if (phase === 'playing') {
        playMs += dt;
      } else if (phase === 'stalled') {
        stallMs += dt;
      }

      const ranges = Array.from({ length: video.buffered.length }, (_, i) => ({
        start: video.buffered.start(i),
        end: video.buffered.end(i),
      }));
      const buffer = bufferAheadSeconds(ranges, video.currentTime);

      points = [...points, { t: (now - startedAt) / 1000, buffer, stalled: phase === 'stalled' }].slice(-MAX_POINTS);

      setState({
        phase,
        error,
        levels,
        currentLevel: currentLevelIndex(),
        bufferSeconds: buffer,
        estimateKbps: Math.round(hls.bandwidthEstimate / 1000) || 0,
        position: video.currentTime,
        duration: Number.isFinite(video.duration) ? video.duration : 0,
        points,
        switches,
        summary: summary(),
      });
    };

    hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
      levels = data.levels.map((level, index) => ({
        index,
        name: level.name || `${level.height}p`,
        bitrateKbps: Math.round(level.bitrate / 1000),
      }));
      if (!abr) hls.currentLevel = fixedLevel;
      video.play().catch(() => undefined);
    });

    hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
      switches = [...switches, { t: (performance.now() - startedAt) / 1000, level: data.level }];
    });

    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (!data.fatal) return;
      phase = 'error';
      error = `${data.type}: ${data.details}`;
      hls.destroy();
    });

    video.addEventListener('playing', onPlaying);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('ended', onEnded);

    hls.loadSource(MASTER_URL);
    hls.attachMedia(video);
    const timer = window.setInterval(tick, TICK_MS);

    return () => {
      window.clearInterval(timer);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('ended', onEnded);
      hls.destroy();
      video.removeAttribute('src');
      video.load();
      setState(INITIAL_STATE);
    };
    // Options are read once per session; a new session starts when runKey changes.
  }, [options.runKey, videoRef]);

  return { state };
}
