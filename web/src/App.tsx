import { useEffect, useRef, useState } from 'react';
import { BufferChart } from './components/BufferChart';
import { Controls } from './components/Controls';
import { MetricsPanel } from './components/MetricsPanel';
import { RunHistory, type SavedRun } from './components/RunHistory';
import { useHlsSession, type LevelInfo } from './hooks/useHlsSession';
import { formatKbps } from './lib/metrics';

async function currentBandwidthLabel(): Promise<string> {
  try {
    const { kbps } = (await (await fetch('/api/bandwidth')).json()) as { kbps: number };
    return kbps === 0 ? 'sem limite' : formatKbps(kbps);
  } catch {
    return '?';
  }
}

export function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [abr, setAbr] = useState(true);
  const [fixedLevel, setFixedLevel] = useState(2);
  const [runKey, setRunKey] = useState(0);
  const [history, setHistory] = useState<SavedRun[]>([]);
  const nextId = useRef(1);

  // The mode of the session that is running, which may differ from the toggle
  // until the next restart.
  const [runMode, setRunMode] = useState({ abr: true, fixedLevel: 2 });

  const { state, getSummary } = useHlsSession(videoRef, { abr: runMode.abr, fixedLevel: runMode.fixedLevel, runKey });

  // Remembers the ladder so the controls keep their labels between sessions.
  const [levels, setLevels] = useState<LevelInfo[]>([]);
  useEffect(() => {
    if (state.levels.length) setLevels(state.levels);
  }, [state.levels]);

  const modeLabel = (mode: { abr: boolean; fixedLevel: number }) =>
    mode.abr ? 'ABR' : `Fixo ${levels[mode.fixedLevel]?.name ?? ''}`.trim();

  const restart = async () => {
    const summary = getSummary();
    if (summary.playMs + summary.stallMs > 0) {
      const bandwidth = await currentBandwidthLabel();
      setHistory((runs) => [{ ...summary, id: nextId.current++, mode: modeLabel(runMode), bandwidth }, ...runs]);
    }
    setRunMode({ abr, fixedLevel });
    setRunKey((key) => key + 1);
  };

  return (
    <main className="layout">
      <header className="header">
        <h1>Laboratório de Streaming</h1>
        <p>
          Player HLS com rede simulada e métricas de QoE medidas dentro do player. Reduza a banda e observe o buffer, os
          travamentos e a reação do ABR.
        </p>
      </header>

      <div className="grid">
        <div className="stack">
          <section className="card video-card">
            <video ref={videoRef} muted playsInline className="video" />
            {state.phase === 'stalled' && <div className="overlay">Travado: carregando…</div>}
            {state.phase === 'joining' && <div className="overlay">Iniciando…</div>}
            {state.phase === 'error' && <div className="overlay overlay-error">{state.error}</div>}
            <div className="progress" aria-hidden>
              <div
                className="progress-bar"
                style={{ width: state.duration ? `${(state.position / state.duration) * 100}%` : '0%' }}
              />
            </div>
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

      <RunHistory runs={history} onClear={() => setHistory([])} />
    </main>
  );
}
