// Constantes dos jogos e tudo que fica salvo no navegador.
(function () {
  const Aim = (window.Aim = window.Aim || {});

  // yaw  = graus girados por "count" do mouse com sensibilidade 1 (valor oficial de cada jogo).
  // hfov = campo de visão horizontal em 16:9.
  Aim.GAMES = {
    valorant: { label: 'Valorant', yaw: 0.07, hfov: 103 },
    cs2: { label: 'CS2', yaw: 0.022, hfov: 106.26 },
  };

  // Treinos. Cada arquivo em src/modes/ se registra aqui com
  // { label, description, create({ radius, speed, duration, holdToTrack }) }.
  Aim.MODES = {};

  // radius  = raio do alvo em metros (alvos ficam entre 5,5 m e 7,5 m da câmera).
  // speed   = multiplicador de velocidade dos alvos que se movem.
  // recordId mantém os recordes salvos antes de existir "dificuldade".
  Aim.DIFFICULTIES = {
    easy: { label: 'Fácil', radius: 0.34, speed: 0.75, recordId: 'large' },
    medium: { label: 'Médio', radius: 0.26, speed: 1, recordId: 'medium' },
    hard: { label: 'Difícil', radius: 0.18, speed: 1.3, recordId: 'small' },
  };

  // 0 = "Padrão": sem tempo fixo, só para treinos com `untimed` (acabam por derrota).
  Aim.DURATIONS = [0, 30, 60, 120];

  // Movimento do alvo no treino de seguir.
  Aim.MOVEMENTS = {
    free: { label: 'Livre' },
    horizontal: { label: 'Horizontal' },
  };

  const SETTINGS_KEY = 'simple-aimlab:settings';
  const BEST_KEY = 'simple-aimlab:best';
  const HISTORY_KEY = 'simple-aimlab:history';
  const HISTORY_LIMIT = 400;

  const DEFAULTS = {
    mode: 'gridshot',
    difficulty: 'medium',
    duration: 60,
    movement: 'free',
    game: 'valorant',
    sens: { valorant: 0.35, cs2: 1.6 },
    dpi: 800,
    // Medidas da mira em pixels de tela.
    crosshair: { color: '#00ff88', length: 6, thickness: 2, gap: 3, dot: false },
    sound: true,
    holdToTrack: false, // treinos de seguir só pontuam com o clique pressionado
  };

  function read(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch {
      return fallback;
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
    const saved = read(SETTINGS_KEY, {});
    // Formatos antigos: mira era só a cor; dificuldade era "tamanho do alvo".
    if (typeof saved.crosshair === 'string') saved.crosshair = { color: saved.crosshair };
    if (saved.size && !saved.difficulty) {
      saved.difficulty = { large: 'easy', medium: 'medium', small: 'hard' }[saved.size];
    }
    delete saved.size;
    // "Seguir strafe" virou "Seguir o alvo" com movimento horizontal.
    if (saved.mode === 'strafe') {
      saved.mode = 'tracking';
      saved.movement = 'horizontal';
    }

    const settings = {
      ...DEFAULTS,
      ...saved,
      sens: { ...DEFAULTS.sens, ...saved.sens },
      crosshair: { ...DEFAULTS.crosshair, ...saved.crosshair },
    };
    if (!Aim.GAMES[settings.game]) settings.game = DEFAULTS.game;
    if (!Aim.DIFFICULTIES[settings.difficulty]) settings.difficulty = DEFAULTS.difficulty;
    if (!Aim.MOVEMENTS[settings.movement]) settings.movement = DEFAULTS.movement;
    if (!Aim.DURATIONS.includes(settings.duration)) settings.duration = DEFAULTS.duration;
    return settings;
  };

  Aim.saveSettings = function (settings) {
    write(SETTINGS_KEY, settings);
  };

  // Distância em cm que o mouse percorre para um giro de 360°.
  Aim.cm360 = function (game, sens, dpi) {
    return (360 / (Aim.GAMES[game].yaw * sens * dpi)) * 2.54;
  };

  // Recordes e histórico são separados por treino + jogo + dificuldade + duração.
  function runId(s) {
    // Recordes antigos do strafe ficam sob o id "strafe".
    const mode = s.mode === 'tracking' && s.movement === 'horizontal' ? 'strafe' : s.mode;
    return `${mode}:${s.game}:${Aim.DIFFICULTIES[s.difficulty].recordId}:${s.duration}`;
  }

  Aim.getBest = function (settings) {
    return read(BEST_KEY, {})[runId(settings)] || 0;
  };

  // Guarda a partida no histórico e atualiza o recorde.
  // Retorna true quando é recorde novo.
  Aim.saveRun = function (settings, score, accuracy) {
    const id = runId(settings);

    const history = read(HISTORY_KEY, []);
    history.push({ id, t: Date.now(), score, acc: accuracy });
    write(HISTORY_KEY, history.slice(-HISTORY_LIMIT));

    const bests = read(BEST_KEY, {});
    if (score <= (bests[id] || 0)) return false;
    bests[id] = score;
    write(BEST_KEY, bests);
    return true;
  };

  // Últimas partidas (mais antiga primeiro) na configuração atual.
  Aim.getRuns = function (settings, count) {
    const id = runId(settings);
    return read(HISTORY_KEY, [])
      .filter((run) => run.id === id)
      .slice(-count);
  };
})();
