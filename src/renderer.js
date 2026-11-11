// Desenha a sala, os alvos e a mira em um canvas 2D (sem WebGL, sem libs).
(function () {
  const Aim = (window.Aim = window.Aim || {});

  const NEAR = 0.05;
  const TARGET_COLORS = ['#c9fff3', '#22d3b0', '#0b7f6a'];
  const HOT_COLORS = ['#fff3c9', '#ffb020', '#b85c00']; // mira em cima (modo seguir)
  const ROOM = { halfWidth: 6, halfHeight: 3, halfDepth: 8 };

  // Linhas da grade nas 6 faces da sala: [ax, ay, az, bx, by, bz].
  function buildRoom() {
    const { halfWidth: W, halfHeight: H, halfDepth: D } = ROOM;
    const segs = [];
    for (let x = -W; x <= W; x++) {
      for (const z of [-D, D]) segs.push([x, -H, z, x, H, z]);
      for (const y of [-H, H]) segs.push([x, y, -D, x, y, D]);
    }
    for (let y = -H; y <= H; y++) {
      for (const z of [-D, D]) segs.push([-W, y, z, W, y, z]);
      for (const x of [-W, W]) segs.push([x, y, -D, x, y, D]);
    }
    for (let z = -D; z <= D; z++) {
      for (const y of [-H, H]) segs.push([-W, y, z, W, y, z]);
      for (const x of [-W, W]) segs.push([x, -H, z, x, H, z]);
    }
    return segs;
  }

  // Traz o ponto p (atrás da câmera) até o plano NEAR, ao longo do segmento p-q.
  function clipToNear(p, q) {
    const t = (NEAR - p.z) / (q.z - p.z);
    p.x += (q.x - p.x) * t;
    p.y += (q.y - p.y) * t;
    p.z = NEAR;
  }

  class Renderer {
    constructor(canvas, camera) {
      this.canvas = canvas;
      this.camera = camera;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.room = buildRoom();
      this.dpr = 1;
      this._a = { x: 0, y: 0, z: 0 };
      this._b = { x: 0, y: 0, z: 0 };
    }

    resize(hfov) {
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(window.innerWidth * this.dpr);
      this.canvas.height = Math.round(window.innerHeight * this.dpr);
      this.camera.setViewport(this.canvas.width, this.canvas.height, hfov);
    }

    draw(mode, now, crosshairColor) {
      const { ctx, canvas } = this;
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      this._drawRoom();
      if (mode) {
        this._drawTargets(mode);
        this._drawEffects(mode, now);
      }
      this._drawCrosshair(crosshairColor);
    }

    _drawRoom() {
      const { ctx, camera, _a: a, _b: b } = this;
      const { cx, cy, focal } = camera;
      ctx.beginPath();
      for (const s of this.room) {
        camera.toCamera(s[0], s[1], s[2], a);
        camera.toCamera(s[3], s[4], s[5], b);
        if (a.z < NEAR && b.z < NEAR) continue;
        if (a.z < NEAR) clipToNear(a, b);
        else if (b.z < NEAR) clipToNear(b, a);
        ctx.moveTo(cx + (a.x / a.z) * focal, cy - (a.y / a.z) * focal);
        ctx.lineTo(cx + (b.x / b.z) * focal, cy - (b.y / b.z) * focal);
      }
      ctx.strokeStyle = '#263041';
      ctx.lineWidth = this.dpr;
      ctx.stroke();
    }

    _drawTargets(mode) {
      const { ctx, camera, _a: p } = this;
      for (const t of mode.targets) {
        camera.toCamera(t.x, t.y, t.z, p);
        if (p.z < NEAR + mode.radius) continue;
        const sx = camera.cx + (p.x / p.z) * camera.focal;
        const sy = camera.cy - (p.y / p.z) * camera.focal;
        const r = (mode.radius / p.z) * camera.focal;
        const g = ctx.createRadialGradient(sx - r * 0.35, sy - r * 0.35, r * 0.05, sx, sy, r);
        const colors = t.hot ? HOT_COLORS : TARGET_COLORS;
        g.addColorStop(0, colors[0]);
        g.addColorStop(0.45, colors[1]);
        g.addColorStop(1, colors[2]);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Anel que se expande onde o alvo foi destruído.
    _drawEffects(mode, now) {
      const { ctx, camera, _a: p } = this;
      for (const e of mode.effects) {
        const k = (now - e.t0) / mode.effectMs;
        if (k < 0 || k > 1) continue;
        camera.toCamera(e.x, e.y, e.z, p);
        if (p.z < NEAR) continue;
        const sx = camera.cx + (p.x / p.z) * camera.focal;
        const sy = camera.cy - (p.y / p.z) * camera.focal;
        const r = ((mode.radius * (1 + k * 0.8)) / p.z) * camera.focal;
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = '#c9fff3';
        ctx.lineWidth = 3 * this.dpr;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    _drawCrosshair(color) {
      const { ctx, dpr } = this;
      const { cx, cy } = this.camera;
      const gap = 3 * dpr;
      const len = 6 * dpr;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.moveTo(cx - gap - len, cy);
      ctx.lineTo(cx - gap, cy);
      ctx.moveTo(cx + gap, cy);
      ctx.lineTo(cx + gap + len, cy);
      ctx.moveTo(cx, cy - gap - len);
      ctx.lineTo(cx, cy - gap);
      ctx.moveTo(cx, cy + gap);
      ctx.lineTo(cx, cy + gap + len);
      ctx.stroke();
    }
  }

  Aim.Renderer = Renderer;
})();
