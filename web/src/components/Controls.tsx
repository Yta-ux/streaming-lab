import type { LevelInfo } from '../hooks/useHlsSession';
import { formatKbps } from '../lib/metrics';
import { BandwidthControl } from './BandwidthControl';

interface Props {
  abr: boolean;
  fixedLevel: number;
  levels: LevelInfo[];
  onAbrChange: (abr: boolean) => void;
  onFixedLevelChange: (level: number) => void;
  onRestart: () => void;
}

export function Controls({ abr, fixedLevel, levels, onAbrChange, onFixedLevelChange, onRestart }: Props) {
  return (
    <section className="card" aria-label="Controles">
      <BandwidthControl />

      <h2>Player</h2>

      <label className="switch">
        <input type="checkbox" checked={abr} onChange={(e) => onAbrChange(e.target.checked)} />
        <span>
          ABR automático <small>(o player escolhe a qualidade)</small>
        </span>
      </label>

      {!abr && (
        <div className="presets" role="radiogroup" aria-label="Qualidade fixa">
          {(levels.length ? levels : [{ index: 0, name: '…', bitrateKbps: 0 }]).map((level) => (
            <button
              key={level.index}
              type="button"
              role="radio"
              aria-checked={fixedLevel === level.index}
              className={fixedLevel === level.index ? 'chip chip-active' : 'chip'}
              onClick={() => onFixedLevelChange(level.index)}
            >
              {level.name}
              {level.bitrateKbps ? ` · ${formatKbps(level.bitrateKbps)}` : ''}
            </button>
          ))}
        </div>
      )}

      <button type="button" className="primary" onClick={onRestart}>
        Reiniciar reprodução
      </button>
    </section>
  );
}
