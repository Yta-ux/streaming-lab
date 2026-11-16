# Roteiro do Nildo: formatos e entrega (fala completa)

**Duração alvo: cerca de 7:00, máximo 8:00.** Gravação de tela com narração, na **aba "Nildo · Formatos e entrega"**. Quatro temas: unicast x multicast, codecs, HLS x MPEG-DASH e ABR. A parte do Italo (buffer, rebuffering e QoE) está em `roteiro-italo.md`.

Blocos em citação (`>`) são fala: pode ler quase palavra por palavra. **Tela:** é o que mostrar. **[espera]** é o teste rodando; pode ficar em silêncio ou comentar o que aparece.

Se passar de 8 minutos, corte do bloco 3. Nunca corte as frases em **negrito**.

## O que cada tema mostra na ferramenta

| Tema | Onde aparece | É real ou simulado? |
|---|---|---|
| HLS x MPEG-DASH | Seção "HLS x MPEG-DASH": mesmo vídeo, dois protocolos, manifesto na tela | Real: hls.js e dash.js tocando de verdade |
| ABR | A mesma seção, com a banda limitada: os dois protocolos adaptam a qualidade | Real |
| Codecs | Seção "Codecs": o mesmo clipe em H.264, H.265, VP9 e AV1 | Real: o ffmpeg codifica e mede |
| Unicast x multicast | Seção "Unicast x Multicast": banda da origem para N espectadores | **Simulado**: é o cálculo da banda, a Internet aberta não faz multicast |

## Antes de gravar

- [ ] `pnpm install`, `pnpm video` (gera HLS e DASH) e `pnpm codecs` já executados
- [ ] `pnpm dev` rodando; navegador em <http://localhost:5173>, zoom de 110% a 125%
- [ ] Aba "Nildo" aberta, banda em "Sem limite"
- [ ] **Use o Chrome ou o Edge**, que tocam H.264. O H.265 pode aparecer como "não" na tabela; isso é esperado e vira assunto no vídeo.
- [ ] Um ensaio completo cronometrado. Em especial o teste 2: anote qual qualidade cada protocolo escolhe a 1 Mbit/s, porque o algoritmo de cada player é diferente e o resultado pode variar.

---

## 1. Os quatro temas (1:30)

**Tela:** aba do Nildo aberta.

> Fala, pessoal! Eu fiquei com a parte de formatos e entrega do streaming. São quatro temas, e o projeto tem um teste pra cada um.
>
> Primeiro, **unicast e multicast**. No unicast, o servidor manda uma cópia do vídeo pra cada espectador. No multicast, ele manda uma cópia só e a própria rede replica pra quem está assistindo. **No unicast, a banda da origem cresce com o número de espectadores.**
>
> Segundo, os **codecs**. O codec é quem comprime o vídeo: H.264, H.265, VP9, AV1. A pergunta é sempre a mesma: quanta qualidade eu consigo com a mesma quantidade de bits.
>
> Terceiro, os protocolos de entrega, **HLS e MPEG-DASH**. Os dois quebram o vídeo em pedaços de poucos segundos e entregam por HTTP comum, junto com um arquivo de índice, o manifesto. O HLS é da Apple e usa `.m3u8`. O DASH é um padrão aberto e usa um `.mpd`.
>
> E quarto, o **ABR**, o streaming com taxa de bits adaptativa. O vídeo existe em várias qualidades, e o player escolhe, pedaço a pedaço, a que cabe na rede naquele momento. É o que HLS e DASH têm em comum.

## 2. HLS x MPEG-DASH e ABR (2:30)

**Tela:** seção "HLS x MPEG-DASH". Começar em **HLS**, **Sem limite**.

> Aqui é o mesmo vídeo, com as mesmas três qualidades, 240p, 480p e 720p, entregue pelos dois protocolos. O que muda é só o protocolo. Embaixo eu mostro o manifesto.
>
> Começando pelo HLS: o manifesto é um texto simples, o `.m3u8`. Cada linha aponta pra uma qualidade, com o bitrate e a resolução.
>
> **Teste 1, sem limite de banda.** **[espera]** O player começa em qualidade baixa, mede a velocidade e sobe pra 720p. Olha o tempo de início e o buffer enchendo.

**Tela:** clicar em **MPEG-DASH**. O vídeo reinicia.

> Agora o DASH. O manifesto é um XML, o `.mpd`. Fala a mesma coisa que o `.m3u8`, só que em outro formato: as qualidades, os bitrates, as resoluções e como achar os pedaços. **O DASH e o HLS fazem o mesmo trabalho: um índice, e o vídeo em pedaços pequenos por HTTP.**
>
> **[espera]** Com a banda livre, também sobe pra 720p e não trava. Nenhuma surpresa.

**Tela:** colocar **1 Mbit/s** (botão ou slider) e clicar em **Reiniciar reprodução**, ainda no DASH.

> **Teste 2, a rede piora: 1 megabit.** E aqui entra o ABR. A qualidade de 720p pede uns 2,5 megabits, e a rede entrega 1. **[espera]** Repara que o player não insiste no 720p: ele mede a vazão e escolhe uma qualidade menor, que cabe na rede. *(comente a qualidade que apareceu; confira no ensaio)*

**Tela:** clicar em **HLS** e **Reiniciar reprodução**, ainda a 1 Mbit/s.

> Agora o HLS na mesma rede. **[espera]** Faz a mesma coisa: baixa a qualidade pra caber na rede. *(compare com o DASH: se escolheram qualidades diferentes, diga que o algoritmo de cada player é diferente)* **O protocolo define o formato dos arquivos; quem decide a qualidade é o algoritmo de ABR do player.** Por isso os dois adaptam, e por isso o resultado pode diferir um pouco.

## 3. Codecs (1:30)

**Tela:** seção "Codecs".

> Agora os codecs. Eu peguei o mesmo clipe de 10 segundos e codifiquei com quatro codecs, **todos com o mesmo bitrate**, 600 kbit/s. Por isso os arquivos têm praticamente o mesmo tamanho: uns 750 KiB.
>
> A diferença está na qualidade. Essa coluna é o PSNR, que mede o quanto o vídeo codificado se parece com o original: **quanto maior, melhor**. O H.264 fica em 38,2 decibéis, o H.265 em 38,4, o VP9 em 39,3 e o AV1 em 41,3. Ou seja, **com os mesmos bits, os codecs mais novos entregam mais qualidade.**
>
> Só que isso tem um preço. Olha o tempo de codificação: o H.264 levou menos de 1 segundo; o AV1, quase 40. Codec melhor comprime melhor, mas custa mais processamento.
>
> E tem outro ponto: **toca aqui?** O navegador decide quais codecs ele sabe decodificar. *(clique em Tocar no H.264 e no AV1; mostre o H.265 como "não", se for o caso)* Se o dispositivo do usuário não decodifica o codec, não adianta ele ser melhor. Por isso o H.264 continua sendo o mais usado: toca em tudo.

*(Se o H.265 aparecer como "sim", troque a última frase por: "Hoje o H.265 depende do navegador e do aparelho, e é por isso que o H.264 ainda é o mais seguro.")*

## 4. Unicast x multicast (1:15)

**Tela:** seção "Unicast x Multicast". Começar com 10 espectadores, 720p.

> Por último, unicast e multicast. Essa parte é uma **simulação**, e eu já aviso: navegador e Internet aberta não fazem multicast de verdade. O gráfico é o cálculo da banda que a origem precisa.
>
> Aqui, com 10 espectadores em 720p, o unicast manda 10 cópias: uns 25 megabits. O multicast manda uma só: 2,5.

**Tela:** arrastar o slider de espectadores até cerca de 50.

> Agora vou aumentando o público. **No unicast a banda cresce junto com o número de espectadores.** A linha preta é a capacidade do link da origem, 100 megabits. A partir de uns 40 espectadores, o unicast passa dela, a barra fica vermelha, e a origem congestiona: **todo mundo passa a sofrer, não só o último que entrou.** Com 200 espectadores seriam uns 500 megabits.
>
> O multicast continua em 2,5 megabits, independente do público. Só que ele precisa de suporte dos roteadores, e na Internet aberta isso não existe. **É por isso que, na prática, o unicast venceu e a escala vem das CDNs**, que colocam cópias do vídeo mais perto dos usuários.

## 5. Conclusão (0:45)

**Tela:** voltar à seção "HLS x MPEG-DASH".

> Resumindo. **HLS e DASH entregam o vídeo em pedaços por HTTP, com um manifesto, e é o ABR do player que escolhe a qualidade.** Os codecs trocam processamento por qualidade: o mesmo bitrate rende mais com os mais novos, mas nem todo aparelho toca. E o unicast escala mal, o multicast escala bem mas não existe na Internet aberta.
>
> Como limitação: o multicast é só uma simulação, e o vídeo é sintético, então os números de codec mudam com o conteúdo. O código está no GitHub, público, com as instruções pra rodar. Valeu!

---

## Tempo total

| Bloco | Tempo |
|---|---|
| 1. Os quatro temas | 1:30 |
| 2. HLS x MPEG-DASH e ABR | 2:30 |
| 3. Codecs | 1:30 |
| 4. Unicast x multicast | 1:15 |
| 5. Conclusão | 0:45 |
| **Total** | **7:30** |

## Dicas de gravação

- Fale como se explicasse pra um colega. Se uma frase sair diferente, tudo bem; só não perca as em negrito.
- Os números de codec (tamanho, PSNR, tempo de codificação) vêm de `pnpm codecs` e mudam um pouco entre máquinas. **Confira a tabela na tela e use os seus números** nas falas do bloco 3. O tempo de codificação é o que mais varia.
- Teste 2: se o DASH e o HLS escolherem a mesma qualidade, ótimo, fale isso. Se escolherem diferente, aproveite pra mostrar que o ABR é decisão do player.
- Ao trocar de protocolo ou de banda, clique em **Reiniciar reprodução** para começar uma sessão nova.

## Perguntas que podem surgir

**Qual é melhor, HLS ou DASH?**
> Pra esse projeto, nenhum: os dois fazem o mesmo trabalho. O HLS é o único aceito nativamente nos aparelhos da Apple, e o DASH é um padrão aberto, usado por exemplo no YouTube e na Netflix. Na prática, muitos serviços entregam os dois.

**Por que o AV1 demora tanto pra codificar?**
> Porque ele testa muito mais formas de comprimir cada quadro. É o preço de entregar mais qualidade com os mesmos bits.

**O que é PSNR?**
> É uma medida de quanto o vídeo codificado se parece com o original, em decibéis. Maior é melhor. Não é perfeita, porque não mede exatamente o que o olho humano percebe, mas serve pra comparar codecs no mesmo clipe.

**O multicast existe de verdade?**
> Existe dentro de redes controladas, como as de operadoras de TV por IP. Na Internet aberta, os roteadores não replicam o tráfego assim, então o streaming usa unicast e CDN.

**Por que o ABR do DASH e do HLS podem escolher qualidades diferentes?**
> Porque o protocolo só define os arquivos. O algoritmo que decide quando subir ou descer a qualidade é de cada player, o hls.js num caso e o dash.js no outro.

**Por que o H.265 não toca no meu navegador?**
> Por causa de licenciamento e de suporte de hardware: nem todo navegador inclui o decodificador. O H.264 toca em praticamente tudo, e por isso ainda é o mais usado.
