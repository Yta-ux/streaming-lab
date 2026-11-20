import { useState } from 'react';
import { DeliveryTab } from './tabs/DeliveryTab';
import { NetworkTab } from './tabs/NetworkTab';

const TABS = [
  { id: 'network', label: 'Rede e QoE' },
  { id: 'delivery', label: 'Formatos e entrega' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function App() {
  const [tab, setTab] = useState<TabId>('network');

  return (
    <main className="layout">
      <header className="topbar">
        <h1>Laboratório de Streaming</h1>
        <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? 'tab tab-active' : 'tab'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        </nav>
      </header>

      {tab === 'network' ? <NetworkTab /> : <DeliveryTab />}
    </main>
  );
}
