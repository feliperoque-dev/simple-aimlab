// Treino "3 alvos": sempre 3 bolinhas numa grade 5x5; acertou, nasce outra.
(function () {
  const Aim = (window.Aim = window.Aim || {});

  const COLS = 5;
  const ROWS = 5;
  const SPACING = 0.9; // metros entre centros
  const DISTANCE = 6.5; // metros da câmera (distância de referência da grade)
  const MIN_DISTANCE = 5.5;
  const MAX_DISTANCE = 7.5;
  const TARGET_COUNT = 3;

  class Gridshot extends Aim.ClickMode {
    constructor(options) {
      super(options);
      for (let i = 0; i < TARGET_COUNT; i++) this.targets.push(this._spawn(-1));
    }

    onKill(index) {
      this.targets[index] = this._spawn(this.targets[index].cell);
    }

    results() {
      return [
        ['Acertos / tiros', `${this.hits} / ${this.shots}`],
        ['Precisão', `${(this.accuracy * 100).toFixed(1)}%`],
        ['Tempo médio por alvo', this.hits ? `${Math.round(this.avgKillMs)} ms` : '—'],
      ];
    }

    _spawn(excludeCell) {
      let cell;
      do {
        cell = Math.floor(Math.random() * COLS * ROWS);
      } while (cell === excludeCell || this.targets.some((t) => t.cell === cell));
      // Cada alvo nasce um pouco mais perto ou mais longe. x/y acompanham a
      // profundidade para o alvo continuar na mesma posição da grade na tela.
      const z = MIN_DISTANCE + Math.random() * (MAX_DISTANCE - MIN_DISTANCE);
      const scale = z / DISTANCE;
      return {
        cell,
        x: ((cell % COLS) - (COLS - 1) / 2) * SPACING * scale,
        y: (Math.floor(cell / COLS) - (ROWS - 1) / 2) * SPACING * scale,
        z,
      };
    }
  }

  Aim.MODES.gridshot = {
    label: '3 alvos',
    description: 'Três bolinhas na tela. Acertou uma, nasce outra.',
    create: (options) => new Gridshot(options),
  };
})();
