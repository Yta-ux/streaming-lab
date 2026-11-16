import { useEffect, useRef, useState } from 'react';

interface CodecInfo {
  id: string;
  name: string;
  file: string;
  mime: string;
  bytes: number;
  kbps: number;
  psnrDb: number | null;
  encodeSeconds: number;
}

interface CodecData {
  durationS: number;
  size: string;
  targetKbps: number;
  codecs: CodecInfo[];
}

export function CodecSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [data, setData] = useState<CodecData | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch('/media/codecs/codecs.json')
      .then((r) => (r.ok ? (r.json() as Promise<CodecData>) : Promise.reject(new Error('missing'))))
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  // Asks the browser whether it can decode each codec.
  const supported = (codec: CodecInfo) => videoRef.current?.canPlayType(codec.mime) !== '';

  const play = (codec: CodecInfo) => {
    const video = videoRef.current;
    if (!video) return;
    setSelected(codec.id);
    video.src = `/media/codecs/${codec.file}`;
    void video.play().catch(() => undefined);
  };

  if (failed) {
    return (
      <section className="card">
        <p className="warning">Arquivos de codecs não encontrados. Rode: pnpm codecs</p>
      </section>
    );
  }

  return (
    <div className="grid">
      <section className="card video-card">
        <video ref={videoRef} muted playsInline controls loop className="video" />
        {!selected && <div className="overlay">Escolha um codec na tabela</div>}
      </section>

      <section className="card">
        <h2>Mesmo vídeo, mesmo bitrate</h2>
        <p className="note">
          Clipe de {data?.durationS ?? '…'} s em {data?.size ?? '…'}, codificado a {data?.targetKbps ?? '…'} kbit/s por
          todos os codecs. PSNR maior = mais parecido com o original.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Codec</th>
                <th>Tamanho</th>
                <th>PSNR</th>
                <th>Codificação</th>
                <th>Toca aqui?</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(data?.codecs ?? []).map((codec) => {
                const ok = supported(codec);
                return (
                  <tr key={codec.id} className={selected === codec.id ? 'row-active' : undefined}>
                    <td>{codec.name}</td>
                    <td>{(codec.bytes / 1024).toFixed(0)} KiB</td>
                    <td>{codec.psnrDb !== null ? `${codec.psnrDb.toFixed(1)} dB` : '—'}</td>
                    <td>{codec.encodeSeconds.toFixed(1)} s</td>
                    <td>{ok ? 'sim' : 'não'}</td>
                    <td>
                      <button type="button" className="chip" disabled={!ok} onClick={() => play(codec)}>
                        Tocar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
