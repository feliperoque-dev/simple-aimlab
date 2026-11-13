// Treino de seguir: uma bolinha se move sem parar e você pontua enquanto a
// mira estiver em cima dela. Dois movimentos (opção "movement"):
//   free       — flutua em curvas suaves, inclusive para perto e para longe;
//   horizontal — anda só para os lados na altura da cabeça, com trocas secas de
//                direção e paradas curtas, como um inimigo fazendo ADAD.
(function () {
  const Aim = (window.Aim = window.Aim || {});

  const POINTS_PER_SECOND = 10;
  const rand = (min, max) => min + Math.random() * (max - min);

  const PATTERNS = {
    free: {
      bounds: { x: 2.4, y: 1.5, zMin: 5.5, zMax: 7.5 },
      steering: 6, // quão rápido a velocidade atual chega na desejada
      turnEvery: [0.5, 1.5], // segundos entre trocas de direção
      pickDirection(wish, speed) {
        const angle = rand(0, Math.PI * 2);
        const v = rand(1.2, 2.6) * speed;
        wish.x = Math.cos(angle) * v;
        wish.y = Math.sin(angle) * v * 0.7;
        wish.z = rand(-0.8, 0.8) * speed;
        return rand(...this.turnEvery);
      },
    },
    horizontal: {
      bounds: { x: 3, y: 0, zMin: 6.5, zMax: 6.5 },
      steering: 30, // quase instantâneo: troca seca
      turnEvery: [0.25, 1.1],
      pickDirection(wish, speed) {
        // Às vezes para por um instante, como quem dá counter-strafe para atirar.
        if (wish.x !== 0 && Math.random() < 0.15) {
          wish.x = 0;
          return rand(0.15, 0.35);
        }
        const direction = wish.x > 0 ? -1 : wish.x < 0 ? 1 : Math.random() < 0.5 ? -1 : 1;
        wish.x = direction * 2.2 * speed;
        return rand(...this.turnEvery);
      },
    },
  };

  const tmp = { x: 0, y: 0, z: 0 };

  class Tracking extends Aim.Mode {
    constructor({ radius, duration, speed, holdToTrack, movement }) {
      super({ radius, duration });
      this.pattern = PATTERNS[movement] || PATTERNS.free;
      this.speed = speed;
      this.holdToTrack = holdToTrack;
      // hot = está pontuando agora (o renderer pinta de outra cor).
      this.targets.push({ x: 0, y: 0, z: 6.5, hot: false });
      this.onTarget = 0; // segundos pontuando
      this.vel = { x: 0, y: 0, z: 0 };
      this.wish = { x: 0, y: 0, z: 0 };
      this.turnIn = 0;
    }

    update(now, camera, firing) {
      const dt = this.tick(now);
      this._move(dt);

      const t = this.targets[0];
      camera.toCamera(t.x, t.y, t.z, tmp);
      const aimed = tmp.z > 0 && tmp.x * tmp.x + tmp.y * tmp.y <= this.radius * this.radius;
      t.hot = aimed && (firing || !this.holdToTrack);
      if (t.hot) this.onTarget += dt;
    }

    get score() {
      return Math.round(this.onTarget * POINTS_PER_SECOND);
    }

    get accuracy() {
      return this.elapsed ? Math.min(1, this.onTarget / this.elapsed) : 0;
    }

    results() {
      return [
        ['Tempo no alvo', `${this.onTarget.toFixed(1)} s de ${this.duration} s`],
        ['Precisão', `${(this.accuracy * 100).toFixed(1)}%`],
      ];
    }

    _move(dt) {
      const { vel, wish, pattern } = this;
      const { bounds } = pattern;
      const t = this.targets[0];

      this.turnIn -= dt;
      if (this.turnIn <= 0) this.turnIn = pattern.pickDirection(wish, this.speed);

      // A velocidade persegue a desejada em vez de trocar de uma vez.
      const k = Math.min(1, pattern.steering * dt);
      vel.x += (wish.x - vel.x) * k;
      vel.y += (wish.y - vel.y) * k;
      vel.z += (wish.z - vel.z) * k;

      t.x += vel.x * dt;
      t.y += vel.y * dt;
      t.z += vel.z * dt;

      this._bounce(t, 'x', -bounds.x, bounds.x);
      this._bounce(t, 'y', -bounds.y, bounds.y);
      this._bounce(t, 'z', bounds.zMin, bounds.zMax);
    }

    // Bateu no limite: volta para dentro e inverte o sentido naquele eixo.
    _bounce(t, axis, min, max) {
      if (t[axis] < min) {
        t[axis] = min;
        this.vel[axis] = Math.abs(this.vel[axis]);
        this.wish[axis] = Math.abs(this.wish[axis]);
      } else if (t[axis] > max) {
        t[axis] = max;
        this.vel[axis] = -Math.abs(this.vel[axis]);
        this.wish[axis] = -Math.abs(this.wish[axis]);
      }
    }
  }

  Aim.MODES.tracking = {
    label: 'Seguir o alvo',
    description: 'Mantenha a mira na bolinha. Movimento livre ou só na horizontal (strafe).',
    create: (options) => new Tracking(options),
  };
})();
