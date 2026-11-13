// Treino "chuva": várias bolinhas pequenas vêm do fundo da sala em direção à
// tela. Acerte antes que cheguem; as que passam somem sem tirar pontos.
// Começa com poucas e devagar; a quantidade e a velocidade sobem até o teto.
// A dificuldade muda só a velocidade. Duas formas de jogar:
//   padrão (duração 0) — sem tempo: acaba quando passam bolinhas demais;
//   tempo fixo        — dura o tempo escolhido e passar bolinhas não encerra.
(function () {
  const Aim = (window.Aim = window.Aim || {});

  const SMALL = 0.55; // bolinhas menores que as dos outros treinos
  const START_COUNT = 2; // bolinhas no começo da partida
  const MAX_COUNT = 10; // bolinhas na tela no fim da subida
  const START_SPEED = 0.6; // fração da velocidade final no começo
  const SPAWN_Z = 8; // fundo da sala: todas as bolinhas nascem aqui
  const END_Z = 1.2; // passou daqui, a bolinha some
  const SPREAD_X = 0.9; // área de nascimento: pequena e no centro do fundo
  const SPREAD_Y = 0.5;
  const RAMP_S = 90; // no modo padrão, segundos até chegar no teto
  const LEAK_BUDGET = 12; // bolinhas que podem passar no modo Padrão
  const BASE_SPEED = 3; // m/s, vezes o multiplicador da dificuldade

  const rand = (min, max) => min + Math.random() * (max - min);

  class Rain extends Aim.ClickMode {
    // Tamanho das bolinhas e área de nascimento são iguais em todas as
    // dificuldades (as do Difícil); só a velocidade muda.
    constructor({ duration, speed }) {
      super({ radius: Aim.DIFFICULTIES.hard.radius * SMALL, duration });
      this.speed = speed;
      this.maxCount = MAX_COUNT;
      this.maxLeaks = LEAK_BUDGET;
      this.leaks = 0;
      for (let i = 0; i < START_COUNT; i++) {
        this.targets.push(this._spawn(SPAWN_Z));
      }
    }

    update(now) {
      const dt = this.tick(now);
      const span = this.duration > 0 ? this.duration : RAMP_S;
      const progress = Math.min(1, this.elapsed / span); // 0 → 1
      const pace = START_SPEED + (1 - START_SPEED) * progress;
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
      if (this.duration === 0 && this.leaks >= this.maxLeaks) this.finished = true;
    }

    get livesLeft() {
      return this.duration === 0 ? Math.max(0, this.maxLeaks - this.leaks) : null;
    }

    onKill(index) {
      this.targets[index] = this._spawn(SPAWN_Z);
    }

    results() {
      return [
        ...(this.duration === 0 ? [['Tempo sobrevivido', `${Math.floor(this.elapsed)} s`]] : []),
        ['Bolinhas que passaram', this.leaks],
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
    untimed: true, // aceita a duração "Padrão" (sem tempo)
    create: (options) => new Rain(options),
  };
})();
