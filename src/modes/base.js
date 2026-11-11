// Base comum dos treinos: relógio, teste de mira e marcas de acerto/erro.
// Os treinos não tocam em DOM nem em canvas: só regras e estatísticas.
(function () {
  const Aim = (window.Aim = window.Aim || {});

  // Duração de cada marca na tela (o renderer usa os mesmos valores).
  Aim.EFFECT_MS = { hit: 180, miss: 700 };
  Aim.HITMARKER_MS = 120;

  const MARK_DISTANCE = 6.5; // profundidade em que a marca de erro é colocada
  const HIT_POINTS = 100;
  const MISS_PENALTY = 50;

  const tmp = { x: 0, y: 0, z: 0 };

  class Mode {
    constructor({ radius, duration }) {
      this.radius = radius; // metros
      this.duration = duration; // segundos
      this.targets = []; // { x, y, z, hot? }
      this.effects = []; // { kind: 'hit' | 'miss', x, y, z, t0 }
      this.elapsed = 0;
      this.finished = false;
      this.startTime = 0;
      this.lastTime = 0;
      this.lastHitAt = -Infinity; // para o hitmarker na mira
    }

    start(now) {
      this.startTime = now;
      this.lastTime = now;
    }

    // Avança o relógio e devolve o tempo desde o último quadro, em segundos.
    tick(now) {
      const dt = Math.min((now - this.lastTime) / 1000, 0.05);
      this.lastTime = now;
      this.elapsed = Math.min((now - this.startTime) / 1000, this.duration);
      if (this.elapsed >= this.duration) this.finished = true;
      if (this.effects.length) {
        this.effects = this.effects.filter((e) => now - e.t0 <= Aim.EFFECT_MS[e.kind]);
      }
      return dt;
    }

    // update(now, camera, firing) — firing = botão esquerdo pressionado.
    update(now) {
      this.tick(now);
    }

    // Clique: true = acertou, false = errou, null = o treino não usa clique.
    shoot() {
      return null;
    }

    // Índice do alvo sob a mira (o mais próximo), ou -1.
    // A mira é o centro da tela, ou seja, o eixo Z da câmera.
    aimedTarget(camera) {
      let index = -1;
      let depth = Infinity;
      for (let i = 0; i < this.targets.length; i++) {
        const t = this.targets[i];
        camera.toCamera(t.x, t.y, t.z, tmp);
        if (tmp.z <= 0 || tmp.z >= depth) continue;
        if (tmp.x * tmp.x + tmp.y * tmp.y <= this.radius * this.radius) {
          index = i;
          depth = tmp.z;
        }
      }
      return index;
    }

    markHit(target, now) {
      this.effects.push({ kind: 'hit', x: target.x, y: target.y, z: target.z, t0: now });
      this.lastHitAt = now;
    }

    // Deixa uma marca onde o tiro passou.
    markMiss(camera, now) {
      camera.aimPoint(MARK_DISTANCE, tmp);
      this.effects.push({ kind: 'miss', x: tmp.x, y: tmp.y, z: tmp.z, t0: now });
    }
  }

  // Treinos de clicar: +100 por acerto, −50 por erro.
  class ClickMode extends Mode {
    constructor(options) {
      super(options);
      this.hits = 0;
      this.shots = 0;
    }

    shoot(camera, now) {
      this.shots++;
      const index = this.aimedTarget(camera);
      if (index < 0) {
        this.markMiss(camera, now);
        this.onMiss(now);
        return false;
      }
      this.hits++;
      this.markHit(this.targets[index], now);
      this.onKill(index, now);
      return true;
    }

    // Cada treino decide o que acontece depois de um acerto ou erro.
    onKill() {}
    onMiss() {}

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
  }

  Aim.Mode = Mode;
  Aim.ClickMode = ClickMode;
})();
