import { useState } from 'react';
import { formatKbps } from '../lib/metrics';

const QUALITIES = [
  { name: '240p', kbps: 464 },
  { name: '480p', kbps: 1064 },
  { name: '720p', kbps: 2564 },
];

const ORIGIN_CAPACITY_KBPS = 100_000;
const MAX_VIEWERS = 200;

function Bar({ label, kbps, scaleKbps }: { label: string; kbps: number; scaleKbps: number }) {
  const over = kbps > ORIGIN_CAPACITY_KBPS;
  return (
    <div className="bar-row">
      <div className="bar-label">
        <span>{label}</span>
        <strong className={over ? 'bad-text' : undefined}>{formatKbps(kbps)}</strong>
      </div>
      <div className="bar-track">
        <div className={over ? 'bar bar-bad' : 'bar'} style={{ width: `${Math.min(100, (kbps / scaleKbps) * 100)}%` }} />
        <div className="bar-limit" style={{ left: `${(ORIGIN_CAPACITY_KBPS / scaleKbps) * 100}%` }} />
      </div>
    </div>
  );
}

export function MulticastSection() {
  const [viewers, setViewers] = useState(10);
  const [qualityIndex, setQualityIndex] = useState(2);
  const quality = QUALITIES[qualityIndex];

  const unicast = viewers * quality.kbps;
  const multicast = quality.kbps;
  const scale = Math.max(unicast, ORIGIN_CAPACITY_KBPS) * 1.1;

  return (
    <div className="grid">
      <section className="card">
        <h2>Banda de saída da origem</h2>
        <Bar label="Unicast: uma cópia por espectador" kbps={unicast} scaleKbps={scale} />
        <Bar label="Multicast: uma cópia para todos" kbps={multicast} scaleKbps={scale} />
        <p className="note">
          A linha vertical é a capacidade do link da origem ({formatKbps(ORIGIN_CAPACITY_KBPS)}). Acima dela, a origem
          congestiona e todos os espectadores sofrem.
        </p>
        <p className="note">
          Simulação: navegadores e a Internet aberta não fazem multicast IP. O gráfico é o cálculo da banda, não uma
          medição.
        </p>
      </section>

      <section className="card">
        <h2>Cenário</h2>
        <label className="slider">
          <span>
            Espectadores: <strong>{viewers}</strong>
          </span>
          <input
            type="range"
            min={1}
            max={MAX_VIEWERS}
            value={viewers}
            onChange={(e) => setViewers(Number(e.target.value))}
          />
        </label>

        <h2>Qualidade do vídeo</h2>
        <div className="presets">
          {QUALITIES.map((q, i) => (
            <button
              key={q.name}
              type="button"
              className={qualityIndex === i ? 'chip chip-active' : 'chip'}
              onClick={() => setQualityIndex(i)}
            >
              {q.name} · {formatKbps(q.kbps)}
            </button>
          ))}
        </div>
        <p className="note">
          Unicast: {viewers} × {formatKbps(quality.kbps)} = {formatKbps(unicast)}. Multicast: {formatKbps(multicast)},
          independente do número de espectadores.
        </p>
      </section>
    </div>
  );
}
