// Treino "chuva": várias bolinhas pequenas vêm do fundo da sala em direção à
// tela. Acerte antes que cheguem; as que passam somem sem tirar pontos.
(function () {
  const Aim = (window.Aim = window.Aim || {});

  const SMALL = 0.55; // bolinhas menores que as dos outros treinos
  const COUNT = 7; // bolinhas na tela ao mesmo tempo
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
      for (let i = 0; i < COUNT; i++) {
        // Começam espalhadas em profundidade para não chegarem todas juntas.
        this.targets.push(this._spawn(rand(END_Z + 1, SPAWN_Z)));
      }
    }

    update(now) {
      const dt = this.tick(now);
      for (let i = 0; i < this.targets.length; i++) {
        const t = this.targets[i];
        t.z -= t.speed * dt;
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
