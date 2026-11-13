// Treino "chuva": várias bolinhas pequenas vêm do fundo da sala em direção à
// tela. Acerte antes que cheguem; as que passam somem sem tirar pontos.
// Começa com poucas e devagar; a quantidade e a velocidade sobem ao longo da
// partida até um teto que depende da dificuldade.
(function () {
  const Aim = (window.Aim = window.Aim || {});

  const SMALL = 0.55; // bolinhas menores que as dos outros treinos
  const START_COUNT = 2; // bolinhas no começo da partida
  const MAX_COUNT = 10; // no fim, vezes o multiplicador da dificuldade
  const START_SPEED = 0.6; // fração da velocidade final no começo
  const SPAWN_Z = 7.5;
  const END_Z = 1.2; // passou daqui, a bolinha some
  const SPREAD_X = 3;
  const SPREAD_Y = 1.6;
  const BASE_SPEED = 3; // m/s, vezes o multiplicador da dificuldade

  const rand = (min, max) => min + Math.random() * (max - min);

  class Rain extends Aim.ClickMode {
    constructor({ radius, duration, speed }) {
      super({ radius: radius * SMALL, duration });
      this.speed = speed;
      this.maxCount = Math.round(MAX_COUNT * speed);
      for (let i = 0; i < START_COUNT; i++) {
        // Começam espalhadas em profundidade para não chegarem todas juntas.
        this.targets.push(this._spawn(rand(END_Z + 1, SPAWN_Z)));
      }
    }

    update(now) {
      const dt = this.tick(now);
      const progress = this.elapsed / this.duration; // 0 → 1
      const pace = START_SPEED + (1 - START_SPEED) * progress;
      const wanted = Math.round(START_COUNT + (this.maxCount - START_COUNT) * progress);
      while (this.targets.length < wanted) this.targets.push(this._spawn(SPAWN_Z));
      for (let i = 0; i < this.targets.length; i++) {
        const t = this.targets[i];
        t.z -= t.speed * pace * dt;
        if (t.z < END_Z) this.targets[i] = this._spawn(SPAWN_Z);
      }
    }

    onKill(index) {
      this.targets[index] = this._spawn(SPAWN_Z);
    }

    results() {
      return [
        ['Acertos / tiros', `${this.hits} / ${this.shots}`],
        ['Precisão', `${(this.accuracy * 100).toFixed(1)}%`],
        ['Tempo médio por alvo', this.hits ? `${Math.round(this.avgKillMs)} ms` : '—'],
      ];
    }

    _spawn(z) {
      return {
        x: rand(-SPREAD_X, SPREAD_X),
        y: rand(-SPREAD_Y, SPREAD_Y),
        z,
        speed: BASE_SPEED * this.speed * rand(0.8, 1.25),
      };
    }
  }

  Aim.MODES.rain = {
    label: 'Chuva de bolinhas',
    description: 'Várias bolinhas pequenas vindo na sua direção. Acerte antes que passem.',
    create: (options) => new Rain(options),
  };
})();
