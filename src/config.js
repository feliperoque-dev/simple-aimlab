// Constantes dos jogos e configurações salvas no navegador.
(function () {
  const Aim = (window.Aim = window.Aim || {});

  // yaw  = graus girados por "count" do mouse com sensibilidade 1 (valor oficial de cada jogo).
  // hfov = campo de visão horizontal em 16:9.
  Aim.GAMES = {
    valorant: { label: 'Valorant', yaw: 0.07, hfov: 103 },
    cs2: { label: 'CS2', yaw: 0.022, hfov: 106.26 },
  };

  // Raio do alvo em metros (os alvos ficam a 6,5 m da câmera).
  Aim.TARGET_SIZES = {
    small: { label: 'Pequeno', radius: 0.18 },
    medium: { label: 'Médio', radius: 0.26 },
    large: { label: 'Grande', radius: 0.34 },
  };

  const SETTINGS_KEY = 'simple-aimlab:settings';
  const BEST_KEY = 'simple-aimlab:best';

  const DEFAULTS = {
    game: 'valorant',
    sens: { valorant: 0.35, cs2: 1.6 },
    dpi: 800,
    size: 'medium',
    duration: 60,
    crosshair: '#00ff88',
    sound: true,
  };

  function read(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || {};
    } catch {
      return {};
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Armazenamento indisponível (aba anônima etc.): segue sem salvar.
    }
  }

  Aim.loadSettings = function () {
    const saved = read(SETTINGS_KEY);
    return { ...DEFAULTS, ...saved, sens: { ...DEFAULTS.sens, ...saved.sens } };
  };

  Aim.saveSettings = function (settings) {
    write(SETTINGS_KEY, settings);
  };

  // Distância em cm que o mouse percorre para um giro de 360°.
  Aim.cm360 = function (game, sens, dpi) {
    return (360 / (Aim.GAMES[game].yaw * sens * dpi)) * 2.54;
  };

  function bestId(s) {
    return `gridshot:${s.game}:${s.size}:${s.duration}`;
  }

  Aim.getBest = function (settings) {
    return read(BEST_KEY)[bestId(settings)] || 0;
  };

  // Salva o recorde se for maior; retorna true quando é recorde novo.
  Aim.submitScore = function (settings, score) {
    const all = read(BEST_KEY);
    if (score <= (all[bestId(settings)] || 0)) return false;
    all[bestId(settings)] = score;
    write(BEST_KEY, all);
    return true;
  };
})();
