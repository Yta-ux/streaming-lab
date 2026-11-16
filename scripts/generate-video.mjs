// Generates a synthetic HLS ladder (3 renditions) into ./media using ffmpeg.
// The source is a lavfi test pattern with a running timer, so no video file
// needs to be downloaded or committed to the repository.

import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegStatic from 'ffmpeg-static';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mediaDir = path.join(root, 'media');
const ffmpeg = process.env.FFMPEG_PATH || ffmpegStatic;

const DURATION_S = 120;
const SEGMENT_S = 4;
const FPS = 30;

/** Bitrates are the video target; audio adds 64 kbit/s on top. */
const LADDER = [
  { name: '240p', width: 426, height: 240, videoKbps: 400 },
  { name: '480p', width: 854, height: 480, videoKbps: 1000 },
  { name: '720p', width: 1280, height: 720, videoKbps: 2500 },
];
const AUDIO_KBPS = 64;

if (!ffmpeg) {
  console.error('ffmpeg não encontrado. Defina FFMPEG_PATH ou reinstale as dependências.');
  process.exit(1);
}

rmSync(mediaDir, { recursive: true, force: true });
mkdirSync(mediaDir, { recursive: true });

for (const rendition of LADDER) {
  const dir = path.join(mediaDir, rendition.name);
  mkdirSync(dir, { recursive: true });
  console.log(`Gerando ${rendition.name} (${rendition.videoKbps} kbit/s)...`);

  const gop = FPS * SEGMENT_S;
  const args = [
    '-y',
    '-f', 'lavfi',
    '-i', `testsrc2=size=${rendition.width}x${rendition.height}:rate=${FPS}`,
    '-f', 'lavfi',
    '-i', 'sine=frequency=440:sample_rate=44100',
    '-t', String(DURATION_S),
    // Noise keeps the encoder from finishing far below the target bitrate.
    '-vf', 'noise=alls=12:allf=t',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-b:v', `${rendition.videoKbps}k`,
    '-maxrate', `${rendition.videoKbps}k`,
    '-bufsize', `${rendition.videoKbps * 2}k`,
    '-g', String(gop),
    '-keyint_min', String(gop),
    '-sc_threshold', '0',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', `${AUDIO_KBPS}k`,
    '-f', 'hls',
    '-hls_time', String(SEGMENT_S),
    '-hls_playlist_type', 'vod',
    '-hls_segment_filename', path.join(dir, 'seg_%03d.ts'),
    path.join(dir, 'index.m3u8'),
  ];

  const result = spawnSync(ffmpeg, args, { stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8' });
  if (result.status !== 0) {
    console.error(result.stderr);
    console.error(`Falha ao gerar ${rendition.name}.`);
    process.exit(1);
  }
}

const master = [
  '#EXTM3U',
  '#EXT-X-VERSION:3',
  ...LADDER.flatMap((r) => [
    `#EXT-X-STREAM-INF:BANDWIDTH=${(r.videoKbps + AUDIO_KBPS) * 1000},RESOLUTION=${r.width}x${r.height},NAME="${r.name}"`,
    `${r.name}/index.m3u8`,
  ]),
  '',
].join('\n');

writeFileSync(path.join(mediaDir, 'master.m3u8'), master);
console.log(`Pronto: ${path.relative(root, mediaDir)}/master.m3u8`);
