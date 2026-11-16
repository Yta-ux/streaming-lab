import { useState } from 'react';
import { ItaloTab } from './tabs/ItaloTab';
import { NildoTab } from './tabs/NildoTab';

const TABS = [
  { id: 'italo', label: 'Italo · Rede e QoE' },
  { id: 'nildo', label: 'Nildo · Formatos e entrega' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function App() {
  const [tab, setTab] = useState<TabId>('italo');

  return (
    <main className="layout">
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

      {tab === 'italo' ? <ItaloTab /> : <NildoTab />}
    </main>
  );
}
