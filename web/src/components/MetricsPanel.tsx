import type { Phase, SessionState } from '../hooks/useHlsSession';
import { formatKbps, formatPercent, formatSeconds } from '../lib/metrics';

const PHASE_LABEL: Record<Phase, string> = {
  idle: 'Parado',
  joining: 'Iniciando',
  playing: 'Reproduzindo',
  stalled: 'Travado (rebuffering)',
  ended: 'Finalizado',
  error: 'Erro',
};

export interface MetricProps {
  label: string;
  value: string;
  hint?: string;
  tone?: 'good' | 'bad';
}

export function Metric({ label, value, hint, tone }: MetricProps) {
  return (
    <div className={`metric${tone ? ` metric-${tone}` : ''}`}>
      <span className="metric-label">{label}</span>
      <span className="metric-value">{value}</span>
      {hint && <span className="metric-hint">{hint}</span>}
    </div>
  );
}

export function MetricsPanel({ state }: { state: SessionState }) {
  const { summary, levels, currentLevel, phase } = state;
  const level = levels[currentLevel];
  const ratioTone = summary.bufferingRatio > 0.05 ? 'bad' : summary.playMs > 0 ? 'good' : undefined;

  return (
    <section className="card" aria-label="Métricas de QoE">
      <h2>
        Métricas de QoE <span className={`badge badge-${phase}`}>{PHASE_LABEL[phase]}</span>
      </h2>

      <div className="metrics-grid">
        <Metric label="Buffer à frente" value={`${state.bufferSeconds.toFixed(1)} s`} />
        <Metric label="Qualidade atual" value={level ? `${level.name} · ${formatKbps(level.bitrateKbps)}` : '—'} />
        <Metric label="Vazão estimada" value={state.estimateKbps ? formatKbps(state.estimateKbps) : '—'} hint="medida pelo player" />
        <Metric label="Tempo de início" value={formatSeconds(summary.joinTimeMs)} hint="join time" />
        <Metric label="Travamentos" value={String(summary.stalls)} tone={summary.stalls > 0 ? 'bad' : undefined} />
        <Metric
          label="Taxa de buffering"
          value={formatPercent(summary.bufferingRatio)}
          hint="tempo travado / tempo total"
          tone={ratioTone}
        />
      </div>
    </section>
  );
}
