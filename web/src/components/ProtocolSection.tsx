import { useEffect, useRef, useState } from 'react';
import { MANIFEST_URL, useProtocolSession, type Protocol } from '../hooks/useProtocolSession';
import { formatPercent, formatSeconds } from '../lib/metrics';
import { BandwidthControl } from './BandwidthControl';
import { Metric } from './MetricsPanel';

const LABEL: Record<Protocol, string> = { hls: 'HLS', dash: 'MPEG-DASH' };
const MANIFEST_LINES = 22;

export function ProtocolSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [protocol, setProtocol] = useState<Protocol>('hls');
  const [runKey, setRunKey] = useState(0);
  const [manifest, setManifest] = useState('');

  const state = useProtocolSession(videoRef, protocol, runKey);

  useEffect(() => {
    setManifest('');
    fetch(MANIFEST_URL[protocol])
      .then((r) => r.text())
      .then((text) => setManifest(text.split('\n').slice(0, MANIFEST_LINES).join('\n')))
      .catch(() => setManifest('Não foi possível carregar o manifesto.'));
  }, [protocol]);

  return (
    <div className="grid">
      <div className="stack">
        <section className="card video-card">
          <video ref={videoRef} muted playsInline className="video" />
          {state.phase === 'stalled' && <div className="overlay">Travado: carregando…</div>}
          {state.phase === 'joining' && <div className="overlay">Iniciando…</div>}
          {state.phase === 'error' && <div className="overlay overlay-error">{state.error}</div>}
        </section>

        <section className="card">
          <h2>
            Manifesto: <code>{MANIFEST_URL[protocol]}</code>
          </h2>
          <pre className="manifest">{manifest || '…'}</pre>
        </section>
      </div>

      <div className="stack">
        <section className="card">
          <h2>Protocolo</h2>
          <div className="presets">
            {(Object.keys(LABEL) as Protocol[]).map((p) => (
              <button
                key={p}
                type="button"
                className={protocol === p ? 'chip chip-active' : 'chip'}
                onClick={() => setProtocol(p)}
              >
                {LABEL[p]}
              </button>
            ))}
          </div>

          <BandwidthControl />

          <button type="button" className="primary" onClick={() => setRunKey((k) => k + 1)}>
            Reiniciar reprodução
          </button>
          <p className="note">Mesmo vídeo, mesmas qualidades e mesmo ABR: só muda o protocolo.</p>
        </section>

        <section className="card">
          <h2>Métricas</h2>
          <div className="metrics-grid">
            <Metric label="Protocolo" value={LABEL[protocol]} />
            <Metric label="Qualidade atual" value={state.quality} />
            <Metric label="Buffer à frente" value={`${state.bufferSeconds.toFixed(1)} s`} />
            <Metric label="Tempo de início" value={formatSeconds(state.joinTimeMs)} />
            <Metric label="Travamentos" value={String(state.stalls)} tone={state.stalls > 0 ? 'bad' : undefined} />
            <Metric label="Taxa de buffering" value={formatPercent(state.bufferingRatio)} />
          </div>
        </section>
      </div>
    </div>
  );
}
