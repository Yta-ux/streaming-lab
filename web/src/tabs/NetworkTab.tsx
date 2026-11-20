import { useEffect, useRef, useState } from 'react';
import { BufferChart } from '../components/BufferChart';
import { Controls } from '../components/Controls';
import { MetricsPanel } from '../components/MetricsPanel';
import { useHlsSession, type LevelInfo } from '../hooks/useHlsSession';

export function NetworkTab() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [abr, setAbr] = useState(true);
  const [runKey, setRunKey] = useState(0);

  const [fixedLevel, setFixedLevel] = useState(2);
  const [runMode, setRunMode] = useState({ abr: true, fixedLevel: 2 });

  const { state } = useHlsSession(videoRef, { abr: runMode.abr, fixedLevel: runMode.fixedLevel, runKey });

  const [levels, setLevels] = useState<LevelInfo[]>([]);
  useEffect(() => {
    if (state.levels.length) setLevels(state.levels);
  }, [state.levels]);

  const restart = () => {
    setRunMode({ abr, fixedLevel });
    setRunKey((key) => key + 1);
  };

  return (
    <div>
      <div className="grid">
        <div className="stack">
          <section className="card video-card">
            <video ref={videoRef} muted playsInline className="video" />
            {state.phase === 'stalled' && <div className="overlay">Travado: carregando…</div>}
            {state.phase === 'joining' && <div className="overlay">Iniciando…</div>}
            {state.phase === 'error' && <div className="overlay overlay-error">{state.error}</div>}
          </section>

          <section className="card" aria-label="Buffer">
            <h2>Nível do buffer</h2>
            <BufferChart points={state.points} />
            <p className="legend">
              <span className="dot dot-line" /> segundos de vídeo à frente · <span className="dot dot-stall" /> travamento
            </p>
          </section>
        </div>

        <div className="stack">
          <Controls
            abr={abr}
            fixedLevel={fixedLevel}
            levels={levels}
            onAbrChange={setAbr}
            onFixedLevelChange={setFixedLevel}
            onRestart={restart}
          />
          <MetricsPanel state={state} />
        </div>
      </div>
    </div>
  );
}
