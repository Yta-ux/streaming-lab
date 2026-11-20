import type { ChartPoint } from '../hooks/useHlsSession';

interface Props {
  points: ChartPoint[];
  maxSeconds?: number;
  windowSeconds?: number;
}

const WIDTH = 600;
const HEIGHT = 130;
const PAD = { top: 10, right: 10, bottom: 22, left: 34 };

export function BufferChart({ points, maxSeconds = 30, windowSeconds = 60 }: Props) {
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;

  const last = points.length ? points[points.length - 1].t : 0;
  const start = Math.max(0, last - windowSeconds);
  const visible = points.filter((p) => p.t >= start);

  const x = (t: number) => PAD.left + ((t - start) / windowSeconds) * innerW;
  const y = (seconds: number) => PAD.top + innerH - (Math.min(seconds, maxSeconds) / maxSeconds) * innerH;

  const line = visible.map((p) => `${x(p.t).toFixed(1)},${y(p.buffer).toFixed(1)}`).join(' ');
  const area = visible.length
    ? `${x(visible[0].t).toFixed(1)},${y(0)} ${line} ${x(visible[visible.length - 1].t).toFixed(1)},${y(0)}`
    : '';

  const bands: { from: number; to: number }[] = [];
  for (const p of visible) {
    const open = bands[bands.length - 1];
    if (p.stalled) {
      if (open && open.to === -1) continue;
      bands.push({ from: p.t, to: -1 });
    } else if (open && open.to === -1) {
      open.to = p.t;
    }
  }
  if (bands.length && bands[bands.length - 1].to === -1) bands[bands.length - 1].to = last;

  const ticks = [0, 10, 20, 30].filter((v) => v <= maxSeconds);

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="chart" role="img" aria-label="Nível do buffer ao longo do tempo">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(v)} y2={y(v)} className="chart-grid" />
          <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end" className="chart-label">
            {v}s
          </text>
        </g>
      ))}

      {bands.map((band, i) => (
        <rect
          key={i}
          x={x(band.from)}
          y={PAD.top}
          width={Math.max(2, x(band.to) - x(band.from))}
          height={innerH}
          className="chart-stall"
        />
      ))}

      {area && <polygon points={area} className="chart-area" />}
      {line && <polyline points={line} className="chart-line" />}

      <text x={PAD.left} y={HEIGHT - 6} className="chart-label">
        últimos {windowSeconds} s
      </text>
    </svg>
  );
}
