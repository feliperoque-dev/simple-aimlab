// Modo "3 bolinhas": sempre 3 alvos numa grade 5x5; acertou, nasce outro.
// Não toca em DOM nem em canvas: só regras e estatísticas.
(function () {
  const Aim = (window.Aim = window.Aim || {});

  const COLS = 5;
  const ROWS = 5;
  const SPACING = 0.9; // metros entre centros
  const DISTANCE = 6.5; // metros da câmera
  const TARGET_COUNT = 3;
  const HIT_POINTS = 100;
  const MISS_PENALTY = 50;
  const EFFECT_MS = 180;

  const tmp = { x: 0, y: 0, z: 0 };

  class Gridshot {
    constructor({ radius, duration }) {
      this.radius = radius;
      this.duration = duration; // segundos
      this.targets = []; // { cell, x, y, z }
      this.effects = []; // { x, y, z, t0 }
      this.effectMs = EFFECT_MS;
      this.hits = 0;
      this.shots = 0;
      this.elapsed = 0;
      this.finished = false;
      this.startTime = 0;
      for (let i = 0; i < TARGET_COUNT; i++) this.targets.push(this._spawn(-1));
    }

    start(now) {
      this.startTime = now;
    }

    update(now) {
      this.elapsed = Math.min((now - this.startTime) / 1000, this.duration);
      if (this.elapsed >= this.duration) this.finished = true;
      while (this.effects.length && now - this.effects[0].t0 > EFFECT_MS) this.effects.shift();
    }

    // A mira é o centro da tela, ou seja, o eixo Z da câmera.
    // Retorna true se acertou.
    shoot(camera, now) {
      this.shots++;
      let hitIndex = -1;
      let hitDepth = Infinity;
      for (let i = 0; i < this.targets.length; i++) {
        const t = this.targets[i];
        camera.toCamera(t.x, t.y, t.z, tmp);
        if (tmp.z <= 0 || tmp.z >= hitDepth) continue;
        if (tmp.x * tmp.x + tmp.y * tmp.y <= this.radius * this.radius) {
          hitIndex = i;
          hitDepth = tmp.z;
        }
      }
      if (hitIndex < 0) return false;

      const hit = this.targets[hitIndex];
      this.hits++;
      this.effects.push({ x: hit.x, y: hit.y, z: hit.z, t0: now });
      this.targets[hitIndex] = this._spawn(hit.cell);
      return true;
    }

    get score() {
      return Math.max(0, this.hits * HIT_POINTS - (this.shots - this.hits) * MISS_PENALTY);
    }

    get accuracy() {
      return this.shots ? this.hits / this.shots : 0;
    }

    // Tempo médio por alvo em ms (0 se não acertou nada).
    get avgKillMs() {
      return this.hits ? (this.elapsed * 1000) / this.hits : 0;
    }

    _spawn(excludeCell) {
      let cell;
      do {
        cell = Math.floor(Math.random() * COLS * ROWS);
      } while (cell === excludeCell || this.targets.some((t) => t.cell === cell));
      return {
        cell,
        x: ((cell % COLS) - (COLS - 1) / 2) * SPACING,
        y: (Math.floor(cell / COLS) - (ROWS - 1) / 2) * SPACING,
        z: DISTANCE,
      };
    }
  }

  Aim.Gridshot = Gridshot;
})();
