// Base comum dos treinos: relógio e teste de mira. Acerto/erro só têm som (main.js).
// Os treinos não tocam em DOM nem em canvas: só regras e estatísticas.
(function () {
  const Aim = (window.Aim = window.Aim || {});

  const HIT_POINTS = 100;
  const MISS_PENALTY = 50;

  const tmp = { x: 0, y: 0, z: 0 };

  class Mode {
    constructor({ radius, duration }) {
      this.radius = radius; // metros
      this.duration = duration; // segundos; 0 = sem limite de tempo
      this.targets = []; // { x, y, z, hot? }
      this.elapsed = 0;
      this.finished = false;
      this.startTime = 0;
      this.lastTime = 0;
    }

    start(now) {
      this.startTime = now;
      this.lastTime = now;
    }

    // Avança o relógio e devolve o tempo desde o último quadro, em segundos.
    tick(now) {
      const dt = Math.min((now - this.lastTime) / 1000, 0.05);
      this.lastTime = now;
      this.elapsed = (now - this.startTime) / 1000;
      if (this.duration > 0 && this.elapsed >= this.duration) {
        this.elapsed = this.duration;
        this.finished = true;
      }
      return dt;
    }

    // Vidas restantes para o HUD, ou null se o treino não usa vidas.
    get livesLeft() {
      return null;
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
        this.onMiss(now);
        return false;
      }
      this.hits++;
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
