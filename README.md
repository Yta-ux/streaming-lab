# Laboratório de Streaming

Aplicação web para observar, na prática, como a rede afeta a reprodução de vídeo. Um player HLS reproduz um vídeo servido por uma origem cuja banda pode ser limitada em tempo real, e um painel mede a qualidade de experiência (QoE) dentro do próprio player.

Projeto prático do seminário **Streaming e Distribuição Multimídia** (Tópicos Especiais em Redes de Computadores), que tratou de buffering, congestionamento e QoE.

## O que o projeto demonstra

| Conceito do seminário | Onde aparece |
|---|---|
| Buffer de reprodução e rebuffering | Gráfico do nível do buffer e contagem de travamentos |
| Vazão menor que a taxa de bits do vídeo | Qualidade fixa em 720p com banda limitada: o buffer esvazia e o vídeo trava |
| ABR (adaptação de taxa de bits) | Com o ABR ligado, o player reduz a qualidade quando a vazão cai |
| QoE medida no cliente (Dobrian et al., 2011) | Painel com tempo de início, taxa de buffering, frequência de travamentos e bitrate médio |

## Requisitos

- Node.js 20 ou superior
- Um navegador moderno (Chrome, Edge, Firefox ou Safari)

O ffmpeg é instalado automaticamente como dependência (`ffmpeg-static`); não é preciso ter o ffmpeg no sistema.

## Como executar

```bash
pnpm install
pnpm video   # gera o vídeo HLS em ./media (cerca de 25 s)
pnpm dev     # servidor em :3001 e interface em :5173
```

Abra <http://localhost:5173>.

Para rodar a versão compilada, com um único processo:

```bash
pnpm start       # compila a interface e serve tudo em http://localhost:3001
```

## Como usar

1. **Rede simulada:** escolha um limite de banda (botões ou controle deslizante). A mudança vale imediatamente, inclusive no meio de um segmento.
2. **Player:** ligue ou desligue o ABR. Com o ABR desligado, escolha a qualidade fixa.
3. **Reiniciar reprodução:** salva a execução atual no histórico e começa outra com as opções escolhidas. O histórico permite comparar configurações.

Experimentos sugeridos:

| Experimento | Configuração | Resultado esperado |
|---|---|---|
| Referência | Sem limite, ABR ligado | Sobe para 720p, buffer cheio, sem travamentos |
| Rede insuficiente | 1 Mbit/s, qualidade fixa 720p | Travamentos repetidos, taxa de buffering acima de 50% |
| Adaptação | 1 Mbit/s, ABR ligado | Reproduz em 240p, sem travamentos |
| Queda de banda | Sem limite, ABR ligado, depois 1 Mbit/s durante a reprodução | O buffer absorve a queda e o player reduz a qualidade |

## Como funciona

```
 Navegador (React + hls.js)  ──HTTP──▶  Servidor Node (origem)  ──▶  ./media (HLS)
   player + painel de QoE                 limitador de banda
         │                                       ▲
         └──── POST /api/bandwidth ──────────────┘
```

**Vídeo.** O script `scripts/generate-video.mjs` gera, com o ffmpeg, um vídeo sintético de 120 s em três qualidades (240p, 480p e 720p) e segmentos de 4 s. Nenhum arquivo de vídeo é versionado.

**Servidor.** `server/src/index.js` serve os arquivos de `./media`. Os segmentos (`.ts`) são enviados em pequenos blocos, com o volume por intervalo calculado a partir do limite atual em kbit/s. As playlists não são limitadas. O limite é lido a cada intervalo de 50 ms, então muda mesmo durante um download. As respostas usam `Cache-Control: no-store` para que o navegador não esconda o limitador com cópias em cache.

| Rota | Função |
|---|---|
| `GET /media/*` | Playlists e segmentos HLS |
| `GET /api/bandwidth` | Limite atual em kbit/s (`0` = sem limite) |
| `POST /api/bandwidth` | Define o limite. Corpo: `{"kbps": 1000}`. Aceita `0` ou valores de 50 a 100000 |

**Métricas.** O hook `web/src/hooks/useHlsSession.ts` observa os eventos do elemento `<video>` e do hls.js, seguindo as definições do artigo de Dobrian et al. (2011):

| Métrica | Definição |
|---|---|
| Tempo de início (*join time*) | Do início da sessão até o primeiro quadro exibido |
| Travamentos | Interrupções da reprodução depois que ela começou (evento `waiting`) |
| Taxa de buffering (*buffering ratio*) | Tempo travado dividido pelo tempo total da sessão |
| Frequência de travamentos | Travamentos por minuto de sessão |
| Bitrate médio | Média dos bitrates reproduzidos, ponderada pelo tempo em cada um |
| Buffer à frente | Segundos de vídeo já recebidos além da posição atual |

As funções de cálculo estão em `web/src/lib/metrics.ts`, separadas do DOM e cobertas por testes unitários.

## Estrutura

```
streaming-lab/
├── scripts/generate-video.mjs   gera o HLS com ffmpeg
├── server/src/index.js          origem com limitador de banda
├── web/src/
│   ├── hooks/useHlsSession.ts   sessão do player e coleta de métricas
│   ├── lib/metrics.ts           cálculo das métricas (testado)
│   └── components/              player, gráfico, controles, métricas, histórico
└── docs/roteiro-video.md        roteiro da apresentação em vídeo
```

## Comandos

| Comando | Função |
|---|---|
| `pnpm video` | Gera o vídeo em `./media` |
| `pnpm dev` | Servidor e interface em modo de desenvolvimento |
| `pnpm start` | Compila e serve tudo em `:3001` |
| `pnpm test` | Testes unitários das métricas |
| `pnpm typecheck` | Verificação de tipos |

## Limitações

- A limitação de banda é aplicada na aplicação (origem), e não na camada de transporte. Ela reproduz a **vazão** de um enlace congestionado, mas não perda de pacotes nem o comportamento do controle de congestionamento do TCP.
- O vídeo é sintético; o objetivo é medir a entrega, não o conteúdo.
- Há uma única origem; não há CDN. O tema de CDN do seminário não é coberto aqui.
- As métricas seguem as definições de Dobrian et al. (2011), mas medem uma sessão local, não uma amostra de usuários reais.

## Referências

- DOBRIAN, F. et al. Understanding the impact of video quality on user engagement. ACM SIGCOMM, 2011.
- PANTOS, R.; MAY, W. RFC 8216: HTTP Live Streaming. IETF, 2017.
- KUROSE, J. F.; ROSS, K. W. Redes de computadores e a Internet: uma abordagem top-down. 6. ed. Pearson, 2013. Cap. 7.

## Licença

MIT
