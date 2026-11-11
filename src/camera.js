// Câmera em primeira pessoa, parada na origem, olhando para +Z.
(function () {
  const Aim = (window.Aim = window.Aim || {});
  const DEG = Math.PI / 180;
  const MAX_PITCH = 89 * DEG;

  class Camera {
    constructor() {
      this.yaw = 0;
      this.pitch = 0;
      this.cx = 0;
      this.cy = 0;
      this.focal = 1;
      this._trig();
    }

    reset() {
      this.yaw = 0;
      this.pitch = 0;
      this._trig();
    }

    // hfov169 é o FOV horizontal em 16:9. O FOV vertical fica fixo e telas mais
    // largas enxergam mais para os lados (Hor+), como nos dois jogos.
    setViewport(width, height, hfov169) {
      const tanHalfV = (Math.tan((hfov169 * DEG) / 2) * 9) / 16;
      this.cx = width / 2;
      this.cy = height / 2;
      this.focal = height / 2 / tanHalfV;
    }

    // dx/dy em counts do mouse; degPerCount = yaw do jogo × sensibilidade.
    rotate(dx, dy, degPerCount) {
      this.yaw += dx * degPerCount * DEG;
      this.pitch -= dy * degPerCount * DEG;
      if (this.pitch > MAX_PITCH) this.pitch = MAX_PITCH;
      if (this.pitch < -MAX_PITCH) this.pitch = -MAX_PITCH;
      this._trig();
    }

    _trig() {
      this.cosY = Math.cos(this.yaw);
      this.sinY = Math.sin(this.yaw);
      this.cosP = Math.cos(this.pitch);
      this.sinP = Math.sin(this.pitch);
    }

    // Ponto do mundo que está exatamente sob a mira, à profundidade z dada.
    aimPoint(z, out) {
      const fz = Math.max(this.cosY * this.cosP, 0.05);
      out.x = (this.sinY * this.cosP * z) / fz;
      out.y = (this.sinP * z) / fz;
      out.z = z;
      return out;
    }

    // Mundo -> espaço da câmera (z = profundidade à frente da mira).
    toCamera(x, y, z, out) {
      const x1 = x * this.cosY - z * this.sinY;
      const z1 = x * this.sinY + z * this.cosY;
      out.x = x1;
      out.y = y * this.cosP - z1 * this.sinP;
      out.z = y * this.sinP + z1 * this.cosP;
      return out;
    }
  }

  Aim.Camera = Camera;
})();
