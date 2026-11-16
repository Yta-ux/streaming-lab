import { useEffect, useState, type RefObject } from 'react';
import Hls from 'hls.js';
import { MediaPlayer, type QualityChangeRenderedEvent } from 'dashjs';
import { bufferAheadSeconds, bufferingRatio } from '../lib/metrics';

export type Protocol = 'hls' | 'dash';

export const MANIFEST_URL: Record<Protocol, string> = {
  hls: '/media/master.m3u8',
  dash: '/media/dash/manifest.mpd',
};

export interface ProtocolState {
  phase: 'joining' | 'playing' | 'stalled' | 'error';
  error: string | null;
  joinTimeMs: number | null;
  stalls: number;
  bufferingRatio: number;
  bufferSeconds: number;
  quality: string;
}

const INITIAL: ProtocolState = {
  phase: 'joining',
  error: null,
  joinTimeMs: null,
  stalls: 0,
  bufferingRatio: 0,
  bufferSeconds: 0,
  quality: '—',
};

const TICK_MS = 250;

/**
 * Plays the same video through HLS (hls.js) or MPEG-DASH (dash.js) and measures
 * the same metrics for both, so the two protocols can be compared.
 */
export function useProtocolSession(videoRef: RefObject<HTMLVideoElement>, protocol: Protocol, runKey: number) {
  const [state, setState] = useState<ProtocolState>(INITIAL);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const startedAt = performance.now();
    let lastTick = startedAt;
    let phase: ProtocolState['phase'] = 'joining';
    let error: string | null = null;
    let joinTimeMs: number | null = null;
    let stalls = 0;
    let stallMs = 0;
    let playMs = 0;
    let quality = '—';

    setState(INITIAL);

    const onPlaying = () => {
      if (phase === 'joining') joinTimeMs = performance.now() - startedAt;
      if (phase === 'joining' || phase === 'stalled') phase = 'playing';
    };
    const onWaiting = () => {
      if (phase !== 'playing') return;
      phase = 'stalled';
      stalls += 1;
    };
    video.addEventListener('playing', onPlaying);
    video.addEventListener('waiting', onWaiting);

    const timer = window.setInterval(() => {
      const now = performance.now();
      const dt = now - lastTick;
      lastTick = now;
      if (phase === 'playing') playMs += dt;
      else if (phase === 'stalled') stallMs += dt;

      const ranges = Array.from({ length: video.buffered.length }, (_, i) => ({
        start: video.buffered.start(i),
        end: video.buffered.end(i),
      }));
      setState({
        phase,
        error,
        joinTimeMs,
        stalls,
        bufferingRatio: bufferingRatio(stallMs, playMs),
        bufferSeconds: bufferAheadSeconds(ranges, video.currentTime),
        quality,
      });
    }, TICK_MS);

    let teardown: () => void;

    if (protocol === 'hls') {
      const hls = new Hls({ maxBufferLength: 30, maxMaxBufferLength: 30, startLevel: -1 });
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        void video.play().catch(() => undefined);
      });
      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        const level = hls.levels[data.level];
        if (level) quality = `${level.height}p · ${Math.round(level.bitrate / 1000)} kbit/s`;
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          phase = 'error';
          error = `Erro no HLS: ${data.details}`;
        }
      });
      hls.loadSource(MANIFEST_URL.hls);
      hls.attachMedia(video);
      teardown = () => hls.destroy();
    } else {
      const player = MediaPlayer().create();
      player.updateSettings({
        streaming: { buffer: { bufferTimeDefault: 30, bufferTimeAtTopQuality: 30, bufferTimeAtTopQualityLongForm: 30 } },
      });
      player.on('qualityChangeRendered', (event) => {
        const change = event as QualityChangeRenderedEvent;
        if (change.mediaType !== 'video') return;
        const rep = change.newRepresentation;
        quality = `${rep.height}p · ${Math.round(rep.bitrateInKbit)} kbit/s`;
      });
      player.on('error', () => {
        phase = 'error';
        error = 'Erro no DASH';
      });
      player.initialize(video, MANIFEST_URL.dash, true);
      teardown = () => player.destroy();
    }

    return () => {
      window.clearInterval(timer);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('waiting', onWaiting);
      teardown();
      video.removeAttribute('src');
      video.load();
    };
  }, [videoRef, protocol, runKey]);

  return state;
}
