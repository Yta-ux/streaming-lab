# Laboratório de Streaming

Aplicação web para observar, na prática, como a rede afeta a reprodução de vídeo e como o vídeo é codificado e entregue. Um player reproduz um vídeo servido por uma origem cuja banda pode ser limitada em tempo real, e um painel mede a qualidade de experiência (QoE) dentro do próprio player.

A interface tem duas abas, uma para cada parte do trabalho:

- **Italo · Rede e QoE:** buffer, rebuffering, ABR e métricas de QoE.
- **Nildo · Formatos e entrega:** HLS x MPEG-DASH, codecs e unicast x multicast.

Projeto prático do seminário **Streaming e Distribuição Multimídia** (Tópicos Especiais em Redes de Computadores), que tratou de buffering, congestionamento e QoE.

## O que o projeto demonstra

| Conceito do seminário | Aba | Onde aparece |
|---|---|---|
| Buffer de reprodução e rebuffering | Italo | Gráfico do nível do buffer e contagem de travamentos |
| Vazão menor que a taxa de bits do vídeo | Italo | Qualidade fixa em 720p com banda limitada: o buffer esvazia e o vídeo trava |
| ABR (adaptação de taxa de bits) | Italo e Nildo | Com o ABR ligado, o player reduz a qualidade quando a vazão cai |
| QoE medida no cliente (Dobrian et al., 2011) | Italo | Painel com tempo de início, travamentos e taxa de buffering |
| HLS e MPEG-DASH | Nildo | O mesmo vídeo entregue pelos dois protocolos, com o manifesto na tela |
| Codecs | Nildo | O mesmo clipe em H.264, H.265, VP9 e AV1, com tamanho, qualidade (PSNR) e tempo de codificação |
| Unicast x multicast | Nildo | Banda da origem para N espectadores (simulação) |

## Requisitos

- Node.js 20 ou superior
- pnpm 9 ou superior
- Um navegador moderno (Chrome, Edge, Firefox ou Safari)

O ffmpeg é instalado automaticamente como dependência (`ffmpeg-static`); não é preciso ter o ffmpeg no sistema.

## Como executar

```bash
pnpm install
pnpm video   # gera o vídeo HLS e DASH em ./media (cerca de 45 s)
pnpm codecs  # gera os clipes da aba Nildo (cerca de 1 min, o AV1 é lento)
pnpm dev     # servidor em :3001 e interface em :5173
```

Abra <http://localhost:5173>.

Para rodar a versão compilada, com um único processo:

```bash
pnpm start       # compila a interface e serve tudo em http://localhost:3001
```

## Como usar

### Aba Italo

1. **Rede simulada:** escolha o limite de banda (botões ou controle deslizante). A mudança vale imediatamente, inclusive no meio de um segmento.
2. **Player:** ligue ou desligue o ABR. Com o ABR ligado, o player começa no 240p e sobe conforme a vazão permite. Com o ABR desligado, escolha a qualidade fixa.
3. **Reiniciar reprodução:** começa uma nova sessão com as opções escolhidas.

Experimentos sugeridos:

| Experimento | Configuração | Resultado esperado |
|---|---|---|
| Referência | Sem limite, ABR ligado | Começa em 240p e sobe para 720p; buffer cheio, sem travamentos |
| Rede insuficiente | 1 Mbit/s, qualidade fixa 720p | Travamentos repetidos, taxa de buffering acima de 50% |
| Queda de banda | Sem limite, ABR ligado, depois 1 Mbit/s durante a reprodução | O buffer absorve a queda; depois de cerca de 40 s o player reduz para 240p |
| Limite do ABR | 500 kbit/s, ABR ligado | O player fica no 240p, o piso, e ainda trava: a rede é menor que a menor qualidade |

### Aba Nildo

1. **HLS x MPEG-DASH:** escolha o protocolo e o limite de banda. O manifesto aparece embaixo, e as métricas são as mesmas para os dois.
2. **Codecs:** tabela com o mesmo clipe em quatro codecs, todos no mesmo bitrate. Mostra tamanho, PSNR, tempo de codificação e se o navegador toca o codec. O botão *Tocar* abre o clipe.
3. **Unicast x multicast:** escolha o número de espectadores e a qualidade. O gráfico compara a banda de saída da origem nos dois modos. É uma simulação.

Experimentos sugeridos na aba Nildo:

| Experimento | Configuração | Resultado esperado |
|---|---|---|
| Protocolos sem limite | HLS e DASH, sem limite | Os dois sobem para 720p, sem travar |
| ABR nos dois protocolos | HLS e DASH, 1 Mbit/s | Os dois adaptam a qualidade à vazão; o algoritmo de cada player decide |
| Codecs | Tabela de codecs | Mesmo tamanho; PSNR aumenta de H.264 para AV1, e o tempo de codificação também |
| Unicast congestiona | 720p, mais de 40 espectadores | A banda do unicast passa da capacidade de 100 Mbit/s; o multicast não muda |

## Como funciona

```
 Navegador (React + hls.js/dash.js)  ──HTTP──▶  Servidor Node (origem)  ──▶  ./media (HLS, DASH)
   player + painel de QoE                 limitador de banda
         │                                       ▲
         └──── POST /api/bandwidth ──────────────┘
```

**Vídeo.** O script `scripts/generate-video.mjs` gera, com o ffmpeg, um vídeo sintético de 120 s em três qualidades (240p, 480p e 720p) e segmentos de 4 s, empacotado em HLS (`master.m3u8`) e em MPEG-DASH (`dash/manifest.mpd`). O script `scripts/generate-codecs.mjs` gera os clipes de codecs e mede o PSNR de cada um. Nenhum arquivo de vídeo é versionado.

**Servidor.** `server/src/index.js` serve os arquivos de `./media`. Os segmentos (`.ts` do HLS e `.m4s` do DASH) são enviados em pequenos blocos, com o volume por intervalo calculado a partir do limite atual em kbit/s. As playlists, os manifestos e os clipes de codecs não são limitados. O limite é lido a cada intervalo de 50 ms, então muda mesmo durante um download. As respostas usam `Cache-Control: no-store` para que o navegador não esconda o limitador com cópias em cache.

| Rota | Função |
|---|---|
| `GET /media/*` | Playlists, manifestos, segmentos HLS e DASH e clipes de codecs |
| `GET /api/bandwidth` | Limite atual em kbit/s (`0` = sem limite) |
| `POST /api/bandwidth` | Define o limite. Corpo: `{"kbps": 1000}`. Aceita `0` ou valores de 50 a 100000 |

**Métricas.** Na aba Italo, o hook `web/src/hooks/useHlsSession.ts` observa os eventos do elemento `<video>` e do hls.js, seguindo as definições do artigo de Dobrian et al. (2011):

| Métrica | Definição |
|---|---|
| Tempo de início (*join time*) | Do início da sessão até o primeiro quadro exibido |
| Travamentos | Interrupções da reprodução depois que ela começou (evento `waiting`) |
| Taxa de buffering (*buffering ratio*) | Tempo travado dividido pelo tempo total da sessão |
| Buffer à frente | Segundos de vídeo já recebidos além da posição atual |
| Trocas de qualidade | Momento de cada troca de qualidade durante a sessão |

As funções de cálculo estão em `web/src/lib/metrics.ts`, separadas do DOM e cobertas por testes unitários.

## Estrutura

```
streaming-lab/
├── scripts/
│   ├── generate-video.mjs       gera o HLS e o DASH com ffmpeg
│   └── generate-codecs.mjs      gera os clipes de codecs e mede o PSNR
├── server/src/index.js          origem com limitador de banda
├── web/src/
│   ├── tabs/                    aba Italo e aba Nildo
│   ├── hooks/                   sessões de player (HLS; HLS e DASH) e coleta de métricas
│   ├── lib/metrics.ts           cálculo das métricas (testado)
│   └── components/              player, gráfico, controles, métricas, codecs, multicast
```

## Comandos

| Comando | Função |
|---|---|
| `pnpm video` | Gera o vídeo HLS e DASH em `./media` |
| `pnpm codecs` | Gera os clipes de codecs em `./media/codecs` |
| `pnpm dev` | Servidor e interface em modo de desenvolvimento |
| `pnpm start` | Compila e serve tudo em `:3001` |
| `pnpm test` | Testes unitários das métricas |
| `pnpm typecheck` | Verificação de tipos |

## Limitações

- A limitação de banda é aplicada na aplicação (origem), e não na camada de transporte. Ela reproduz a **vazão** de um enlace congestionado, mas não perda de pacotes nem o comportamento do controle de congestionamento do TCP.
- O vídeo é sintético; o objetivo é medir a entrega, não o conteúdo.
- Há uma única origem; não há CDN. O tema de CDN do seminário não é coberto aqui.
- O multicast é simulado: o gráfico é o cálculo da banda da origem, não uma medição. Navegadores e a Internet aberta não fazem multicast IP.
- A comparação de codecs usa um clipe sintético de 10 s; os números mudam com o conteúdo e com a máquina. O H.265 pode não tocar em todos os navegadores.
- As métricas seguem as definições de Dobrian et al. (2011), mas medem uma sessão local, não uma amostra de usuários reais.

## Referências

- DOBRIAN, F. et al. Understanding the impact of video quality on user engagement. ACM SIGCOMM, 2011.
- PANTOS, R.; MAY, W. RFC 8216: HTTP Live Streaming. IETF, 2017.
- KUROSE, J. F.; ROSS, K. W. Redes de computadores e a Internet: uma abordagem top-down. 6. ed. Pearson, 2013. Cap. 7.

## Licença

MIT
