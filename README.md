# Simple Aim Lab

Treino de mira leve para quem joga **Valorant** e **CS2**. Roda no navegador,
pesa alguns kilobytes, não instala nada e não usa CPU/GPU enquanto você está no menu.

**▶ Jogar agora: https://feliperoque-dev.github.io/simple-aimlab/**

Use Chrome ou Edge no computador (mouse sem aceleração e tela cheia com F11).

Quatro treinos:

- **3 alvos:** três bolinhas numa grade 5×5 — acertou uma, nasce outra. Cada uma nasce
  um pouco mais perto ou mais longe, então o tamanho na tela varia.
- **Flick de cabeça:** um alvo pequeno por vez, sempre na altura da cabeça. Entre um alvo
  e outro, leve a mira ao anel de referência no centro da tela; ao parar nele, o próximo
  alvo aparece. O alvo tem tempo de vida curto (cerca de 1,1 s no Médio, mais longo no
  Fácil e mais curto no Difícil); se sumir sem ser acertado, conta como erro (−5). Mostra quantos alvos você acertou no primeiro tiro.
- **Chuva de bolinhas:** várias bolinhas pequenas vêm do fundo da sala na sua direção.
  Acerte antes que passem; as que passam somem sem tirar pontos.
  Não tem tempo fixo: você tem 12 "vidas" e o treino acaba quando passam 12 bolinhas.
  Começa com poucas e devagar; a quantidade e a velocidade sobem sem parar, e a velocidade
  sobe mais rápido nas dificuldades altas. Tamanho das bolinhas e área de nascimento são
  iguais em todas as dificuldades.
- **Seguir o alvo:** uma bolinha se move sem parar e você pontua enquanto a mira estiver
  em cima dela. Dois movimentos, escolhidos no menu: **livre** (curvas suaves, inclusive
  para perto e para longe) ou **horizontal** (só de um lado para o outro, com trocas
  secas de direção e paradas curtas, como um inimigo fazendo ADAD).

Nos treinos de seguir a bolinha fica laranja enquanto você está pontuando.

## Como testar

1. Baixe ou clone o repositório:
   ```bash
   git clone https://github.com/feliperoque-dev/simple-aimlab.git
   ```
2. Abra o arquivo `index.html` no **Chrome** ou **Edge** (dois cliques no arquivo já funciona).
3. Em **Configurações**, escolha o jogo e coloque a mesma sensibilidade que você usa nele.
4. Escolha o treino e clique em **Jogar**.

Não precisa de Node, servidor nem build.

## Controles

| Ação | Tecla |
| --- | --- |
| Atirar | Clique esquerdo |
| Reiniciar o treino | R |
| Jogar de novo (na tela de resultado) | Espaço ou R |
| Cancelar o treino | Esc |
| Tela cheia | F11 |

## Dificuldade

| Nível | Alvo | Velocidade (treinos de seguir) |
| --- | --- | --- |
| Fácil | grande | 75% |
| Médio | médio | 100% |
| Difícil | pequeno | 130% |

## Configurações

O botão **Configurações** no canto do menu guarda o que você ajusta uma vez só:

- **Jogo e mouse:** jogo, sensibilidade e DPI.
- **Mira:** cor, tamanho, espessura, abertura e ponto central, com prévia ao vivo.
- **Cores:** cor dos alvos e cor de fundo (a grade da sala se ajusta ao fundo), com mudança ao vivo.
- **Som** de acerto e erro.
- **Seguir: pontuar só segurando o clique** — para treinar o tracking com o botão
  pressionado, como num spray.

## Sensibilidade igual à do jogo

O giro da câmera usa a mesma conta dos jogos, então a sensibilidade do menu é a mesma
que você digita no jogo:

| Jogo | Graus por count (sens 1) | FOV horizontal (16:9) |
| --- | --- | --- |
| Valorant | 0,07 | 103° |
| CS2 | 0,022 | 106,26° |

O campo **DPI** serve só para mostrar o seu **cm/360°** (quantos centímetros de mouse
para um giro completo) — um jeito rápido de conferir se está igual ao jogo.

O app pede ao navegador o mouse sem aceleração do sistema (*raw input*). Chrome e Edge
no Windows suportam isso; se o navegador não suportar, a tela de resultado avisa.

## Pontuação e evolução

- **3 alvos, Flick de cabeça e Chuva:** acerto **+10**, erro **−5**.
- **Seguir o alvo:** **10 pontos por segundo** com a mira em cima da bolinha.
- Acerto e erro só têm aviso sonoro (dá para desligar nas configurações).
- O recorde e as últimas partidas ficam salvos no navegador, separados por treino, jogo,
  dificuldade e duração. O menu e a tela de resultado mostram um gráfico das últimas 20.

## Estrutura

```
index.html            página única (menu, configurações, HUD e resultado)
css/style.css         visual
src/config.js         dados dos jogos, dificuldades e tudo que fica salvo
src/camera.js         câmera em primeira pessoa e conversão de sensibilidade
src/renderer.js       desenho da sala, alvos e mira
src/modes/base.js     base comum dos treinos (relógio, teste de mira, pontuação)
src/modes/gridshot.js treino de 3 alvos
src/modes/flick.js    treino de flick de cabeça
src/modes/rain.js     treino de chuva de bolinhas
src/modes/tracking.js treino de seguir (movimento livre ou horizontal)
src/main.js           menu, captura do mouse e loop do treino
```

Sem dependências: é HTML, CSS e JavaScript puro. Para criar um treino novo, adicione um
arquivo em `src/modes/` que se registre em `Aim.MODES` (veja os existentes) e inclua o
`<script>` no `index.html`; ele aparece sozinho como um cartão no menu.
