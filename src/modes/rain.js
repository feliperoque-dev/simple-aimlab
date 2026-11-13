// Treino "chuva": várias bolinhas pequenas vêm do fundo da sala em direção à
// tela. Acerte antes que cheguem; as que passam somem sem tirar pontos, mas o
// treino acaba quando passam bolinhas demais (não tem tempo fixo).
// Começa com poucas e devagar; a quantidade e a velocidade sobem sem parar, e
// a velocidade sobe mais rápido nas dificuldades altas.
(function () {
  const Aim = (window.Aim = window.Aim || {});

  const SMALL = 0.55; // bolinhas menores que as dos outros treinos
  const START_COUNT = 2; // bolinhas no começo da partida
  const MAX_COUNT = 10; // bolinhas na tela no fim da subida
  const START_SPEED = 0.6; // fração da velocidade final no começo
  const SPAWN_Z = 22; // fundo da sala: todas as bolinhas nascem aqui
  const REF_Z = 8; // profundidade em que as medidas abaixo foram definidas
  const DEPTH = SPAWN_Z / REF_Z; // mesma área na tela, só que mais longe
  const END_Z = 1.2; // passou daqui, a bolinha some
  const SPREAD_X = 0.9; // área de nascimento: pequena e no centro do fundo
  const SPREAD_Y = 0.5;
  const RAMP_S = 90; // segundos até chegar no máximo de bolinhas
  const GAIN = (1 - START_SPEED) / RAMP_S; // ganho de velocidade por segundo (Médio)
  const MAX_PACE = 1.6; // teto do ganho de velocidade
  const LEAK_BUDGET = 12; // bolinhas que podem passar antes do fim
  const BASE_SPEED = 2.2 * DEPTH; // m/s (percurso maior, mesmo tempo de voo), vezes o multiplicador da dificuldade

  const rand = (min, max) => min + Math.random() * (max - min);

  class Rain extends Aim.ClickMode {
    // Tamanho das bolinhas e área de nascimento são iguais em todas as
    // dificuldades (as do Difícil); só a velocidade muda.
    constructor({ speed }) {
      super({ radius: Aim.DIFFICULTIES.hard.radius * SMALL, duration: 0 }); // sem tempo
      this.speed = speed;
      this.maxCount = MAX_COUNT;
      this.maxLeaks = LEAK_BUDGET;
      this.leaks = 0;
      this.roomDepth = SPAWN_Z; // o renderer aprofunda a sala para este treino
      for (let i = 0; i < START_COUNT; i++) {
        this.targets.push(this._spawn(SPAWN_Z));
      }
    }

    update(now) {
      const dt = this.tick(now);
      const progress = Math.min(1, this.elapsed / RAMP_S); // 0 → 1
      // A velocidade sobe sem parar, e quanto maior a dificuldade mais rápido ela sobe.
      const pace = Math.min(MAX_PACE, START_SPEED + GAIN * this.speed * this.elapsed);
      const wanted = Math.round(START_COUNT + (this.maxCount - START_COUNT) * progress);
      while (this.targets.length < wanted) this.targets.push(this._spawn(SPAWN_Z));
      for (let i = 0; i < this.targets.length; i++) {
        const t = this.targets[i];
        t.z -= t.speed * pace * dt;
        if (t.z < END_Z) {
          this.targets[i] = this._spawn(SPAWN_Z);
          this.leaks++;
        }
      }
      if (this.leaks >= this.maxLeaks) this.finished = true;
    }

    get livesLeft() {
      return Math.max(0, this.maxLeaks - this.leaks);
    }

    onKill(index) {
      this.targets[index] = this._spawn(SPAWN_Z);
    }

    results() {
      return [
        ['Tempo sobrevivido', `${Math.floor(this.elapsed)} s`],
        ['Bolinhas que passaram', this.leaks],
        ['Acertos / tiros', `${this.hits} / ${this.shots}`],
        ['Precisão', `${(this.accuracy * 100).toFixed(1)}%`],
        ['Tempo médio por alvo', this.hits ? `${Math.round(this.avgKillMs)} ms` : '—'],
      ];
    }

    _spawn(z) {
      return {
        x: rand(-SPREAD_X, SPREAD_X) * DEPTH,
        y: rand(-SPREAD_Y, SPREAD_Y) * DEPTH,
        z,
        speed: BASE_SPEED * this.speed * rand(0.8, 1.25),
      };
    }
  }

  Aim.MODES.rain = {
    label: 'Chuva de bolinhas',
    description: 'Várias bolinhas pequenas vindo na sua direção. Acerte antes que passem.',
    endless: true, // sem duração: acaba quando passam bolinhas demais
    create: (options) => new Rain(options),
  };
})();
