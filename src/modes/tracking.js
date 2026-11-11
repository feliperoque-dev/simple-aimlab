// Modo "seguir o alvo": uma bolinha se move sem parar (inclusive para perto e
// para longe) e você pontua enquanto a mira estiver em cima dela. Sem clique.
(function () {
  const Aim = (window.Aim = window.Aim || {});

  // Área em que o alvo pode andar (metros, câmera na origem).
  const BOUNDS = { x: 2.4, y: 1.5, zMin: 5.5, zMax: 7.5 };
  const MIN_SPEED = 1.2; // m/s
  const MAX_SPEED = 2.6;
  const DEPTH_SPEED = 0.8; // m/s máximo para perto/longe
  const STEERING = 6; // quão rápido a velocidade atual chega na desejada
  const MIN_TURN_S = 0.5; // intervalo entre trocas de direção
  const MAX_TURN_S = 1.5;
  const POINTS_PER_SECOND = 100;

  const tmp = { x: 0, y: 0, z: 0 };
  const rand = (min, max) => min + Math.random() * (max - min);

  class Tracking {
    constructor({ radius, duration }) {
      this.radius = radius;
      this.duration = duration; // segundos
      // hot = mira em cima do alvo (o renderer pinta de outra cor).
      this.targets = [{ x: 0, y: 0, z: 6.5, hot: false }];
      this.effects = [];
      this.effectMs = 0;
      this.elapsed = 0;
      this.onTarget = 0; // segundos com a mira no alvo
      this.finished = false;
      this.startTime = 0;
      this.lastTime = 0;
      this.vel = { x: 0, y: 0, z: 0 };
      this.wish = { x: 0, y: 0, z: 0 };
      this.turnIn = 0;
    }

    start(now) {
      this.startTime = now;
      this.lastTime = now;
    }

    update(now, camera) {
      const dt = Math.min((now - this.lastTime) / 1000, 0.05);
      this.lastTime = now;
      this.elapsed = Math.min((now - this.startTime) / 1000, this.duration);
      if (this.elapsed >= this.duration) this.finished = true;

      this._move(dt);

      const t = this.targets[0];
      camera.toCamera(t.x, t.y, t.z, tmp);
      t.hot = tmp.z > 0 && tmp.x * tmp.x + tmp.y * tmp.y <= this.radius * this.radius;
      if (t.hot) this.onTarget += dt;
    }

    // Este modo não usa clique.
    shoot() {
      return null;
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
      const { vel, wish } = this;
      const t = this.targets[0];

      this.turnIn -= dt;
      if (this.turnIn <= 0) {
        const angle = rand(0, Math.PI * 2);
        const speed = rand(MIN_SPEED, MAX_SPEED);
        wish.x = Math.cos(angle) * speed;
        wish.y = Math.sin(angle) * speed * 0.7; // movimento mais horizontal, como um inimigo
        wish.z = rand(-DEPTH_SPEED, DEPTH_SPEED);
        this.turnIn = rand(MIN_TURN_S, MAX_TURN_S);
      }

      // Curva suave: a velocidade persegue a desejada em vez de trocar de uma vez.
      const k = Math.min(1, STEERING * dt);
      vel.x += (wish.x - vel.x) * k;
      vel.y += (wish.y - vel.y) * k;
      vel.z += (wish.z - vel.z) * k;

      t.x += vel.x * dt;
      t.y += vel.y * dt;
      t.z += vel.z * dt;

      this._bounce(t, 'x', -BOUNDS.x, BOUNDS.x);
      this._bounce(t, 'y', -BOUNDS.y, BOUNDS.y);
      this._bounce(t, 'z', BOUNDS.zMin, BOUNDS.zMax);
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
    description: 'Mantenha a mira em cima da bolinha em movimento. Não precisa clicar.',
    create: (options) => new Tracking(options),
  };
})();
