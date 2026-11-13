// Treino "flick de cabeça": um alvo pequeno por vez, sempre na altura da
// cabeça. Entre um alvo e outro a mira volta ao anel de referência no centro;
// só depois de parar nele o próximo alvo aparece. Mede o acerto no primeiro tiro.
(function () {
  const Aim = (window.Aim = window.Aim || {});

  const HEAD_SCALE = 0.6; // alvo menor que o dos outros treinos
  const HALF_WIDTH = 3.2; // metros para cada lado a 6,5 m (uns 26°)
  const MIN_JUMP = 1.2; // distância mínima entre um alvo e o próximo
  const HEIGHT_JITTER = 0.15; // pequena variação de altura
  const DISTANCE = 6.5;
  const MIN_DISTANCE = 5.5;
  const MAX_DISTANCE = 7.5;
  const REF_RADIUS = 0.22; // anel de referência (metros a 6,5 m)
  const HOLD_MS = 250; // tempo parado no anel antes do alvo nascer

  const tmp = { x: 0, y: 0, z: 0 };

  class Flick extends Aim.ClickMode {
    constructor(options) {
      super({ ...options, radius: options.radius * HEAD_SCALE });
      this.firstShotKills = 0;
      this.missesOnTarget = 0; // erros no alvo atual
      this.reference = { x: 0, y: 0, z: DISTANCE };
      this.refRadius = REF_RADIUS;
      this.refReady = false; // mira dentro do anel
      this.holdSince = 0;
      this.lastX = 0;
      this.liveMs = 0; // soma do tempo com alvo na tela
      this.spawnedAt = 0;
    }

    update(now, camera) {
      this.tick(now);
      if (this.targets.length) return;
      camera.toCamera(this.reference.x, this.reference.y, this.reference.z, tmp);
      const r = this.refRadius;
      this.refReady = tmp.z > 0 && tmp.x * tmp.x + tmp.y * tmp.y <= r * r;
      if (!this.refReady) {
        this.holdSince = 0;
        return;
      }
      if (!this.holdSince) this.holdSince = now;
      if (now - this.holdSince >= HOLD_MS) {
        this.targets.push(this._spawn(this.lastX));
        this.spawnedAt = now;
      }
    }

    // Sem alvo na tela o clique não conta.
    shoot(camera, now) {
      return this.targets.length ? super.shoot(camera, now) : null;
    }

    onKill(index, now) {
      if (this.missesOnTarget === 0) this.firstShotKills++;
      this.missesOnTarget = 0;
      this.liveMs += now - this.spawnedAt;
      this.lastX = this.targets[index].gridX;
      this.targets.length = 0;
      this.refReady = false;
      this.holdSince = 0;
    }

    // Tempo médio entre o alvo aparecer e ser acertado.
    get avgKillMs() {
      return this.hits ? this.liveMs / this.hits : 0;
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
        ['Tempo médio para acertar', this.hits ? `${Math.round(this.avgKillMs)} ms` : '—'],
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
    description: 'Volte a mira ao anel central e flicke no alvo pequeno que aparece. Acerte no primeiro tiro.',
    create: (options) => new Flick(options),
  };
})();
