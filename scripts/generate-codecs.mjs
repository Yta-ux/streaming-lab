// Encodes the same short synthetic clip with four codecs into ./media/codecs,
// all at the same target bitrate, and writes codecs.json with the size, the
// quality (PSNR against the source) and the encoding time of each one.

import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegStatic from 'ffmpeg-static';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'media', 'codecs');
const ffmpeg = process.env.FFMPEG_PATH || ffmpegStatic;

const DURATION_S = 10;
const SIZE = '854x480';
const FPS = 30;
const TARGET_KBPS = 600;
/** Keeps every encoder close to the same bitrate, so the comparison is fair. */
const RATE = ['-b:v', `${TARGET_KBPS}k`, '-minrate', `${TARGET_KBPS}k`, '-maxrate', `${TARGET_KBPS}k`, '-bufsize', `${TARGET_KBPS * 2}k`];
const SOURCE = `testsrc2=size=${SIZE}:rate=${FPS}`;

const CODECS = [
  {
    id: 'h264',
    name: 'H.264 (AVC)',
    file: 'h264.mp4',
    mime: 'video/mp4; codecs="avc1.42E01E"',
    args: ['-c:v', 'libx264', '-preset', 'medium', ...RATE, '-pix_fmt', 'yuv420p', '-movflags', '+faststart'],
  },
  {
    id: 'h265',
    name: 'H.265 (HEVC)',
    file: 'h265.mp4',
    mime: 'video/mp4; codecs="hvc1.1.6.L93.B0"',
    args: ['-c:v', 'libx265', '-preset', 'medium', ...RATE, '-tag:v', 'hvc1', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'],
  },
  {
    id: 'vp9',
    name: 'VP9',
    file: 'vp9.webm',
    mime: 'video/webm; codecs="vp09.00.10.08"',
    args: ['-c:v', 'libvpx-vp9', ...RATE, '-deadline', 'good', '-cpu-used', '2', '-row-mt', '1', '-pix_fmt', 'yuv420p'],
  },
  {
    id: 'av1',
    name: 'AV1',
    file: 'av1.mp4',
    mime: 'video/mp4; codecs="av01.0.04M.08"',
    args: ['-c:v', 'libaom-av1', ...RATE, '-cpu-used', '6', '-row-mt', '1', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'],
  },
];

if (!ffmpeg) {
  console.error('ffmpeg não encontrado. Defina FFMPEG_PATH ou reinstale as dependências.');
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const results = [];
for (const codec of CODECS) {
  console.log(`Codificando ${codec.name}...`);
  const target = path.join(outDir, codec.file);
  const args = [
    '-y',
    '-f', 'lavfi',
    '-i', SOURCE,
    '-t', String(DURATION_S),
    ...codec.args,
    '-an',
    target,
  ];

  const started = performance.now();
  const run = spawnSync(ffmpeg, args, { stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8' });
  const encodeSeconds = (performance.now() - started) / 1000;
  if (run.status !== 0) {
    console.error(run.stderr);
    console.error(`Falha ao codificar ${codec.name}.`);
    process.exit(1);
  }

  // PSNR (dB) of the encoded clip against the source: higher means closer to the original.
  const psnr = spawnSync(
    ffmpeg,
    ['-i', target, '-f', 'lavfi', '-i', SOURCE, '-t', String(DURATION_S), '-lavfi', `[0:v]fps=${FPS},setpts=N/${FPS}/TB[a];[1:v]setpts=N/${FPS}/TB[b];[a][b]psnr`, '-f', 'null', '-'],
    { stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8' },
  );
  const psnrMatch = /average:([\d.]+)/.exec(psnr.stderr);

  const bytes = statSync(target).size;
  results.push({
    id: codec.id,
    name: codec.name,
    file: codec.file,
    mime: codec.mime,
    bytes,
    kbps: Math.round((bytes * 8) / DURATION_S / 1000),
    psnrDb: psnrMatch ? Number(Number(psnrMatch[1]).toFixed(1)) : null,
    encodeSeconds: Number(encodeSeconds.toFixed(1)),
  });
  console.log(`  ${(bytes / 1024).toFixed(0)} KiB, PSNR ${psnrMatch?.[1] ?? '?'} dB, ${encodeSeconds.toFixed(1)} s`);
}

writeFileSync(path.join(outDir, 'codecs.json'), JSON.stringify({ durationS: DURATION_S, size: SIZE, targetKbps: TARGET_KBPS, codecs: results }, null, 2));
console.log('Pronto: media/codecs/codecs.json');
