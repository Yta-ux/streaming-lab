# Roteiro do Italo: rede, buffer e QoE (fala completa)

**Duração alvo: cerca de 7:00, máximo 8:00.** Gravação de tela com narração, na **aba "Italo · Rede e QoE"**. Primeiro os conceitos, depois a ferramenta, depois 3 casos de teste. A parte do Nildo (HLS x DASH, codecs, unicast x multicast) está em `roteiro-nildo.md`.

Blocos em citação (`>`) são fala: pode ler quase palavra por palavra. **Tela:** é o que mostrar. **[espera]** é o experimento rodando; pode ficar em silêncio ou comentar o que aparece.

Se passar de 8 minutos, corte do bloco 6. Nunca corte as frases em **negrito**.

## Quais conceitos o projeto cobre

| Conceito do seminário | Cobre? | Onde aparece |
|---|---|---|
| Buffer e rebuffering | Sim | Gráfico do buffer, caso 2 |
| Início da reprodução (join time) | Sim | Métrica "Tempo de início", caso 2 |
| Vazão menor que a taxa do vídeo (congestionamento) | Sim, só a vazão | Limitador de banda, caso 2 |
| ABR | Sim | Caso 3 |
| QoE (Dobrian et al., 2011) | Sim | Painel de métricas, taxa de buffering |
| CDN e DNS | Não | Citar como limitação (bloco 6) |
| HLS x DASH, codecs, unicast x multicast | Na aba do Nildo | `roteiro-nildo.md` |
| TCP e BBR, perda de pacotes | Não | Citar como limitação (bloco 6) |
| Live e atraso | Não | Não citar |

## Antes de gravar

- [ ] `pnpm install` e `pnpm video` já executados
- [ ] `pnpm dev` rodando; navegador em <http://localhost:5173>, zoom de 110% a 125%
- [ ] Notificações desligadas e abas fechadas
- [ ] Página recarregada e banda em "Sem limite"
- [ ] Um ensaio completo cronometrado. Os valores variam um pouco entre máquinas

Valores de referência medidos a 1 Mbit/s com 720p fixo: tempo de início cerca de 10 s, 3 travamentos em 40 s, taxa de buffering cerca de 59%.

---

## 1. Conceitos (1:30)

**Tela:** aplicação aberta na aba Italo.

> Fala, pessoal! Nesse vídeo eu vou mostrar o projeto que fiz em cima do tema do meu seminário: streaming de vídeo. Em vez de só falar de teoria, montei uma ferramenta onde dá pra ver a rede atrapalhando o vídeo ao vivo.
>
> Antes, quatro conceitos rapidinhos.
>
> Primeiro, o **buffer**. O player não toca o vídeo na hora que chega, ele junta alguns segundos antes. Isso absorve as oscilações da Internet.
>
> Segundo, a regra de ouro: **a vazão da rede precisa ser maior que a taxa de bits do vídeo.** É o que acontece num congestionamento: a rede entrega menos do que o vídeo pede, o buffer esvazia, o vídeo para e o player fica "carregando". Isso é o rebuffering.
>
> Terceiro, o **ABR**, adaptação de taxa de bits. O mesmo vídeo existe em várias qualidades, e o player escolhe a que cabe na rede naquele momento.
>
> E quarto, a **QoE**, qualidade de experiência: medir o que o usuário sente, não o que a rede mede. O artigo do Dobrian, de 2011, analisou mais de 2 milhões de visualizações e mostrou que o que mais afasta o usuário é a **taxa de buffering**: o tempo travado dividido pelo tempo total.

## 2. A ferramenta (1:00)

**Tela:** diagrama do README, depois a interface.

> Pra reproduzir isso eu fiz três peças. Um script com ffmpeg que gera um vídeo HLS em três qualidades: 240p, 480p e 720p. Um servidor Node que entrega o vídeo e **limita a banda de envio num valor que eu mudo em tempo real pela interface**, como se fosse um botão de "qualidade da Internet". E uma interface em React com hls.js, que toca o vídeo e calcula as métricas **de dentro do próprio player**, igual ao artigo.
>
> Na tela: o player aqui, o gráfico do nível do buffer embaixo, o slider de banda, o ABR com a qualidade fixa, e o painel de métricas: buffer, qualidade atual, vazão estimada, tempo de início, número de travamentos e a taxa de buffering. São 3 testes. Bora.

## 3. Caso 1: referência (0:30)

**Configurar:** Sem limite, ABR ligado. **Reiniciar reprodução**.

**Tela:** qualidade subindo para 720p e o buffer chegando a cerca de 30 s.

> Primeiro o cenário bom, pra comparar depois. Sem limite de banda, ABR ligado. O player começa em qualidade baixa, mede a velocidade e sobe pra 720p. O buffer enche e não tem travamento. **Aqui a vazão é maior que a taxa do vídeo**, então tudo tranquilo.

## 4. Caso 2: rede insuficiente (1:30)

**Configurar:** **1 Mbit/s** (botão ou slider), **ABR desligado** e qualidade fixa em **720p**. **Reiniciar reprodução**. Deixar rodar de 30 a 40 s.

**Tela:** tempo de início alto, buffer em zero, faixas vermelhas no gráfico, taxa de buffering subindo.

> Agora vou estragar a rede: 1 megabit por segundo, e o ABR desligado, então o vídeo fica preso em 720p, que precisa de uns 2,5. A rede entrega menos do que o vídeo pede.
>
> **[espera]** Olha o tempo de início: passou de 10 segundos só pra começar. Aí toca um pouquinho... e trava. Carrega, toca, trava de novo. Cada faixa vermelha no gráfico é um travamento, e o buffer fica colado no zero.
>
> **Com a vazão abaixo da taxa do vídeo, o buffer não enche e o vídeo trava.** E repara na taxa de buffering: perto de 60%. Mais da metade do tempo o usuário ficou olhando pra tela parada. Pelo artigo, é exatamente isso que faz as pessoas fecharem o vídeo.

## 5. Caso 3: queda de banda com ABR (1:30)

**Configurar:** **Sem limite**, **ABR ligado**. **Reiniciar** e esperar o 720p com o buffer cheio (faça isso antes de gravar, se precisar). Depois clicar em **1 Mbit/s**, sem reiniciar.

**Tela:** buffer diminuindo sem travar e, depois, a troca para 240p.

> Esse último é o que acontece na vida real: a internet piora no meio do vídeo. Estou em 720p, ABR ligado, buffer cheio. Agora eu derrubo a banda pra 1 mega.
>
> **[espera]** O vídeo não travou. O buffer vai esvaziando, mas ainda tem bastante coisa guardada. **O buffer cheio segura a queda enquanto o player reavalia a velocidade.**
>
> E olha: depois de alguns segundos o ABR percebe, derruba pra 240p, e o buffer volta a encher. Em vez de travar, ele aceita uma imagem pior. **O ABR troca qualidade de imagem por continuidade**, e o artigo mostra que é a continuidade que mais pesa pro usuário. Prefiro um vídeo borrado que toca a um vídeo bonito que trava.

## 6. Limitações e conclusão (1:30)

**Tela:** seção "Limitações" do README.

> Sendo honesto sobre as limitações. A banda é limitada na aplicação, então eu simulo a vazão de um link congestionado, mas não simulo perda de pacotes nem o comportamento do TCP e do BBR. E não tem CDN: é uma origem só, então não dá pra mostrar o ganho de aproximar o conteúdo do usuário. Também, as métricas vêm de uma sessão minha, não de usuários reais.
>
> Mesmo assim, o projeto confirma o que a gente estudou: **a vazão precisa superar a taxa do vídeo, o buffer absorve as variações, o ABR troca qualidade por continuidade, e o travamento é o que mais prejudica a experiência.**
>
> O código está no GitHub, público, com as instruções pra rodar. Valeu por assistir!

---

## Tempo total

| Bloco | Tempo |
|---|---|
| 1. Conceitos | 1:30 |
| 2. A ferramenta | 1:00 |
| 3. Caso 1 | 0:30 |
| 4. Caso 2 | 1:30 |
| 5. Caso 3 | 1:30 |
| 6. Limitações e conclusão | 1:30 |
| **Total** | **7:30** |

## Dicas de gravação

- Fale como se explicasse pra um colega. Se uma frase sair diferente, tudo bem; só não perca as em negrito.
- Enquanto o experimento roda, comente o que aparece; os tempos já contam essa espera.
- O caso 3 depende do buffer encher: faça isso antes e comece a gravar já com o 720p estável.
- Não há mais histórico de execuções. Guarde os números do caso 2 na cabeça (início ~10 s, ~59% de buffering) para citar no caso 3, onde o buffering fica em 0%.

## Perguntas que podem surgir

**Por que limitar a banda na aplicação e não na rede?**
> Pra rodar com um comando só, sem permissão de administrador. O preço está nas limitações: não simula perda de pacotes.

**Por que o ABR foi pra 240p e não 480p?**
> O 480p pede uns 1,06 mega, um pouco acima do que a rede entrega. O player só escolhe uma qualidade que a vazão medida aguenta.

**Por que o player manteve o 720p alguns segundos depois da queda?**
> Porque o buffer estava cheio. Ele só reduz quando a vazão medida indica risco de esvaziar.

**O que o evento `waiting` representa?**
> É o elemento de vídeo avisando que parou por falta de dados. É com ele que eu conto um travamento.

**E a CDN, que foi parte do seminário?**
> Fica de fora: o projeto tem uma origem só. A CDN ataca outro problema, a distância até o usuário; aqui o foco é o que acontece quando a vazão é insuficiente.

**Diferença para o artigo do Dobrian?**
> O artigo mediu mais de 2 milhões de visualizações reais; aqui é uma sessão controlada. As definições das métricas são as mesmas.
