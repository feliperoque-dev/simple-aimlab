# Simple Aim Lab

Treino de mira leve para quem joga **Valorant** e **CS2**. Roda no navegador,
pesa alguns kilobytes, não instala nada e não usa CPU/GPU enquanto você está no menu.

Dois treinos:

- **3 alvos (clicar):** três bolinhas numa grade 5×5 — acertou uma, nasce outra. Cada
  uma nasce um pouco mais perto ou mais longe, então o tamanho na tela varia.
- **Seguir o alvo:** uma bolinha se move sem parar (para os lados, para cima e também
  para perto e para longe). Você pontua enquanto a mira estiver em cima dela, sem clicar;
  ela fica laranja quando você está acertando.

## Como testar

1. Baixe ou clone o repositório:
   ```bash
   git clone https://github.com/feliperoque-dev/simple-aimlab.git
   ```
2. Abra o arquivo `index.html` no **Chrome** ou **Edge** (dois cliques no arquivo já funciona).
3. Escolha o treino e o jogo, coloque a mesma sensibilidade que você usa nele e clique em **Jogar**.

Não precisa de Node, servidor nem build.

## Controles

| Ação | Tecla |
| --- | --- |
| Atirar (treino de 3 alvos) | Clique esquerdo |
| Cancelar o treino | Esc |
| Tela cheia | F11 |

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

## Pontuação

- **3 alvos:** acerto **+100**, erro **−50**.
- **Seguir o alvo:** **100 pontos por segundo** com a mira em cima da bolinha.
- O recorde fica salvo no navegador, separado por treino, jogo, tamanho de alvo e duração.

## Estrutura

```
index.html            página única (menu, HUD e resultado)
css/style.css         visual
src/config.js         dados dos jogos e configurações salvas
src/camera.js         câmera em primeira pessoa e conversão de sensibilidade
src/renderer.js       desenho da sala, alvos e mira (canvas 2D)
src/modes/gridshot.js regras do treino de 3 alvos
src/modes/tracking.js regras do treino de seguir o alvo
src/main.js           menu, captura do mouse e loop do treino
```

Sem dependências: é HTML, CSS e JavaScript puro. Para criar um treino novo, adicione um arquivo em `src/modes/` que se registre em
`Aim.MODES` (veja os dois existentes) e inclua o `<script>` no `index.html`.
