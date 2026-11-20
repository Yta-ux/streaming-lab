import { useEffect, useRef, useState } from 'react';
import { formatKbps } from '../lib/metrics';

const PRESETS: { label: string; kbps: number }[] = [
  { label: 'Sem limite', kbps: 0 },
  { label: '4 Mbit/s', kbps: 4000 },
  { label: '2 Mbit/s', kbps: 2000 },
  { label: '1 Mbit/s', kbps: 1000 },
  { label: '500 kbit/s', kbps: 500 },
];

const SLIDER_MIN = 300;
const SLIDER_MAX = 6000;
const SLIDER_STEP = 100;

async function applyBandwidth(kbps: number): Promise<boolean> {
  try {
    const response = await fetch('/api/bandwidth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kbps }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function BandwidthControl() {
  const [kbps, setKbps] = useState(0);
  const [serverOk, setServerOk] = useState(true);
  const debounce = useRef<number>();

  useEffect(() => {
    fetch('/api/bandwidth')
      .then((r) => r.json())
      .then((data: { kbps: number }) => setKbps(data.kbps))
      .catch(() => setServerOk(false));
  }, []);

  const change = (value: number) => {
    setKbps(value);
    window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(async () => setServerOk(await applyBandwidth(value)), 120);
  };

  return (
    <>
      <h2>Rede simulada</h2>

      <div className="presets">
        {PRESETS.map((preset) => (
          <button
            key={preset.kbps}
            type="button"
            className={kbps === preset.kbps ? 'chip chip-active' : 'chip'}
            onClick={() => change(preset.kbps)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <label className="slider">
        <span>
          Limite de banda: <strong>{kbps === 0 ? 'sem limite' : formatKbps(kbps)}</strong>
        </span>
        <input
          type="range"
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          step={SLIDER_STEP}
          value={kbps === 0 ? SLIDER_MAX : kbps}
          onChange={(e) => change(Number(e.target.value))}
        />
      </label>
      {!serverOk && <p className="warning">Não foi possível falar com o servidor. Ele está rodando?</p>}
    </>
  );
}
