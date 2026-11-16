import type { RunSummary } from '../lib/metrics';
import { formatKbps, formatPercent, formatSeconds } from '../lib/metrics';

export interface SavedRun extends RunSummary {
  id: number;
  mode: string;
  bandwidth: string;
}

export function RunHistory({ runs, onClear }: { runs: SavedRun[]; onClear: () => void }) {
  return (
    <section className="card" aria-label="Histórico de execuções">
      <h2>
        Histórico de execuções
        {runs.length > 0 && (
          <button type="button" className="link" onClick={onClear}>
            limpar
          </button>
        )}
      </h2>

      {runs.length === 0 ? (
        <p className="note">Nenhuma execução salva. Use “Reiniciar reprodução” para comparar configurações.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Modo</th>
                <th>Banda</th>
                <th>Início</th>
                <th>Travamentos</th>
                <th>Taxa de buffering</th>
                <th>Bitrate médio</th>
                <th>Duração</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id}>
                  <td>{run.id}</td>
                  <td>{run.mode}</td>
                  <td>{run.bandwidth}</td>
                  <td>{formatSeconds(run.joinTimeMs)}</td>
                  <td>{run.stalls}</td>
                  <td className={run.bufferingRatio > 0.05 ? 'bad' : ''}>{formatPercent(run.bufferingRatio)}</td>
                  <td>{run.avgBitrateKbps ? formatKbps(run.avgBitrateKbps) : '—'}</td>
                  <td>{formatSeconds(run.playMs + run.stallMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
