// Treino "flick de cabeça": um alvo pequeno por vez, sempre na altura da
// cabeça e longe de onde a mira está. Mede a reação e o acerto no primeiro tiro.
(function () {
  const Aim = (window.Aim = window.Aim || {});

  const HEAD_SCALE = 0.6; // alvo menor que o dos outros treinos
  const HALF_WIDTH = 3.2; // metros para cada lado a 6,5 m (uns 26°)
  const MIN_JUMP = 1.2; // distância mínima entre um alvo e o próximo
  const HEIGHT_JITTER = 0.15; // pequena variação de altura
  const DISTANCE = 6.5;
  const MIN_DISTANCE = 5.5;
  const MAX_DISTANCE = 7.5;

  class Flick extends Aim.ClickMode {
    constructor(options) {
      super({ ...options, radius: options.radius * HEAD_SCALE });
      this.firstShotKills = 0;
      this.missesOnTarget = 0; // erros no alvo atual
      this.targets.push(this._spawn(0));
    }

    onKill(index) {
      if (this.missesOnTarget === 0) this.firstShotKills++;
      this.missesOnTarget = 0;
      this.targets[index] = this._spawn(this.targets[index].gridX);
    }

    onMiss() {
      this.missesOnTarget++;
    }

    results() {
      const firstShot = this.hits ? (this.firstShotKills / this.hits) * 100 : 0;
      return [
        ['Acertos / tiros', `${this.hits} / ${this.shots}`],
        ['Precisão', `${(this.accuracy * 100).toFixed(1)}%`],
        ['Acerto no primeiro tiro', `${firstShot.toFixed(0)}%`],
        ['Tempo médio por alvo', this.hits ? `${Math.round(this.avgKillMs)} ms` : '—'],
      ];
    }

    // gridX/gridY são a posição a 6,5 m; x/y acompanham a profundidade sorteada.
    _spawn(previousX) {
      let gridX;
      do {
        gridX = (Math.random() * 2 - 1) * HALF_WIDTH;
      } while (Math.abs(gridX - previousX) < MIN_JUMP);
      const gridY = (Math.random() * 2 - 1) * HEIGHT_JITTER;
      const z = MIN_DISTANCE + Math.random() * (MAX_DISTANCE - MIN_DISTANCE);
      const scale = z / DISTANCE;
      return { gridX, x: gridX * scale, y: gridY * scale, z };
    }
  }

  Aim.MODES.flick = {
    label: 'Flick de cabeça',
    description: 'Um alvo pequeno por vez, na altura da cabeça. Acerte no primeiro tiro.',
    create: (options) => new Flick(options),
  };
})();
