// Desenha a sala, os alvos e a mira em um canvas 2D (sem WebGL, sem libs).
(function () {
  const Aim = (window.Aim = window.Aim || {});

  const NEAR = 0.05;
  const ROOM = { halfWidth: 6, halfHeight: 3, halfDepth: 8 };
  const TARGET_COLORS = ['#c9fff3', '#22d3b0', '#0b7f6a'];
  const HOT_COLORS = ['#fff3c9', '#ffb020', '#b85c00']; // pontuando (treinos de seguir)
  const MISS_COLOR = '#ff5c5c';

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

  // Mira no estilo dos jogos: 4 traços com abertura no meio e ponto opcional.
  // crosshair = { color, length, thickness, gap, dot }, medidas em pixels × scale.
  Aim.drawCrosshair = function (ctx, cx, cy, crosshair, scale) {
    const len = crosshair.length * scale;
    const th = crosshair.thickness * scale;
    const gap = crosshair.gap * scale;
    const x = Math.round(cx - th / 2);
    const y = Math.round(cy - th / 2);
    ctx.fillStyle = crosshair.color;
    if (len > 0) {
      ctx.fillRect(x - gap - len, y, len, th);
      ctx.fillRect(x + th + gap, y, len, th);
      ctx.fillRect(x, y - gap - len, th, len);
      ctx.fillRect(x, y + th + gap, th, len);
    }
    if (crosshair.dot || len <= 0) ctx.fillRect(x, y, th, th);
  };

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

    draw(mode, now, crosshair) {
      const { ctx, canvas, camera } = this;
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      this._drawRoom();
      this._drawTargets(mode);
      this._drawEffects(mode, now);
      Aim.drawCrosshair(ctx, camera.cx, camera.cy, crosshair, this.dpr);
      if (now - mode.lastHitAt < Aim.HITMARKER_MS) this._drawHitmarker(crosshair);
    }

    // Projeta um ponto do mundo na tela. Retorna false se estiver atrás da câmera.
    _project(x, y, z, out) {
      const { camera } = this;
      camera.toCamera(x, y, z, out);
      if (out.z < NEAR) return false;
      out.x = camera.cx + (out.x / out.z) * camera.focal;
      out.y = camera.cy - (out.y / out.z) * camera.focal;
      return true;
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
        if (!this._project(t.x, t.y, t.z, p)) continue;
        const r = (mode.radius / p.z) * camera.focal;
        const g = ctx.createRadialGradient(p.x - r * 0.35, p.y - r * 0.35, r * 0.05, p.x, p.y, r);
        const colors = t.hot ? HOT_COLORS : TARGET_COLORS;
        g.addColorStop(0, colors[0]);
        g.addColorStop(0.45, colors[1]);
        g.addColorStop(1, colors[2]);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Acerto: anel que se expande onde o alvo estava.
    // Erro: um X vermelho onde o tiro passou, que some aos poucos.
    _drawEffects(mode, now) {
      const { ctx, camera, dpr, _a: p } = this;
      for (const e of mode.effects) {
        const k = (now - e.t0) / Aim.EFFECT_MS[e.kind];
        if (k < 0 || k > 1 || !this._project(e.x, e.y, e.z, p)) continue;
        ctx.globalAlpha = 1 - k;
        ctx.beginPath();
        if (e.kind === 'hit') {
          const r = ((mode.radius * (1 + k * 0.8)) / p.z) * camera.focal;
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.strokeStyle = TARGET_COLORS[0];
          ctx.lineWidth = 3 * dpr;
        } else {
          const s = 5 * dpr;
          ctx.moveTo(p.x - s, p.y - s);
          ctx.lineTo(p.x + s, p.y + s);
          ctx.moveTo(p.x + s, p.y - s);
          ctx.lineTo(p.x - s, p.y + s);
          ctx.strokeStyle = MISS_COLOR;
          ctx.lineWidth = 2 * dpr;
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Quatro traços diagonais em volta da mira logo após um acerto.
    _drawHitmarker(crosshair) {
      const { ctx, dpr } = this;
      const { cx, cy } = this.camera;
      const inner = (crosshair.gap + crosshair.length + 4) * dpr * 0.75;
      const outer = inner + 7 * dpr;
      ctx.beginPath();
      for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        ctx.moveTo(cx + dx * inner, cy + dy * inner);
        ctx.lineTo(cx + dx * outer, cy + dy * outer);
      }
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 * dpr;
      ctx.stroke();
    }
  }

  Aim.Renderer = Renderer;
})();
