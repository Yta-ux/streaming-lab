import { useState } from 'react';
import { CodecSection } from '../components/CodecSection';
import { MulticastSection } from '../components/MulticastSection';
import { ProtocolSection } from '../components/ProtocolSection';

const SECTIONS = [
  { id: 'protocol', label: 'HLS x MPEG-DASH' },
  { id: 'codecs', label: 'Codecs' },
  { id: 'multicast', label: 'Unicast x Multicast' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

export function DeliveryTab() {
  const [section, setSection] = useState<SectionId>('protocol');

  return (
    <div>
      <div className="presets subtabs" role="tablist">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={section === s.id}
            className={section === s.id ? 'chip chip-active' : 'chip'}
            onClick={() => setSection(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === 'protocol' && <ProtocolSection />}
      {section === 'codecs' && <CodecSection />}
      {section === 'multicast' && <MulticastSection />}
    </div>
  );
}
