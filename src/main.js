// Liga tudo: menu, captura do mouse, loop do treino e tela de resultado.
(function () {
  const { GAMES, TARGET_SIZES } = Aim;
  const COUNTDOWN_S = 3;

  const $ = (id) => document.getElementById(id);
  const ui = {
    canvas: $('view'),
    menu: $('menu'),
    results: $('results'),
    hud: $('hud'),
    countdown: $('countdown'),
    game: $('game'),
    sens: $('sens'),
    dpi: $('dpi'),
    cm360: $('cm360'),
    size: $('size'),
    duration: $('duration'),
    crosshair: $('crosshair'),
    sound: $('sound'),
    best: $('best'),
    message: $('menu-msg'),
    hudTime: $('hud-time'),
    hudScore: $('hud-score'),
    hudAcc: $('hud-acc'),
  };

  const settings = Aim.loadSettings();
  const camera = new Aim.Camera();
  const renderer = new Aim.Renderer(ui.canvas, camera);

  let state = 'menu'; // menu | countdown | playing | results
  let mode = newMode();
  let countdownStart = 0;
  let rawInput = true;
  let audio = null;

  function newMode() {
    return new Aim.Gridshot({
      radius: TARGET_SIZES[settings.size].radius,
      duration: settings.duration,
    });
  }

  function isRunning() {
    return state === 'countdown' || state === 'playing';
  }

  // ---------- Menu ----------

  function fillSelect(select, options) {
    for (const [value, label] of options) select.add(new Option(label, value));
  }

  function syncMenu() {
    ui.game.value = settings.game;
    ui.sens.value = settings.sens[settings.game];
    ui.dpi.value = settings.dpi;
    ui.size.value = settings.size;
    ui.duration.value = settings.duration;
    ui.crosshair.value = settings.crosshair;
    ui.sound.checked = settings.sound;
    const cm = Aim.cm360(settings.game, settings.sens[settings.game], settings.dpi);
    ui.cm360.textContent = isFinite(cm) ? `${cm.toFixed(1)} cm/360°` : '—';
    ui.best.textContent = Aim.getBest(settings);
  }

  function onSettingsChange(event) {
    const positive = (input, fallback) => {
      const n = parseFloat(input.value);
      return n > 0 ? n : fallback;
    };
    if (event.target === ui.game) {
      settings.game = ui.game.value; // a sensibilidade exibida passa a ser a desse jogo
    } else {
      settings.sens[settings.game] = positive(ui.sens, settings.sens[settings.game]);
    }
    settings.dpi = positive(ui.dpi, settings.dpi);
    settings.size = ui.size.value;
    settings.duration = Number(ui.duration.value);
    settings.crosshair = ui.crosshair.value;
    settings.sound = ui.sound.checked;
    Aim.saveSettings(settings);
    syncMenu();
    mode = newMode();
    renderer.resize(GAMES[settings.game].hfov);
    drawFrame(performance.now());
  }

  function show(panel) {
    ui.menu.hidden = panel !== 'menu';
    ui.results.hidden = panel !== 'results';
    ui.hud.hidden = panel !== 'hud';
    ui.countdown.hidden = state !== 'countdown';
  }

  function backToMenu(message) {
    state = 'menu';
    if (document.pointerLockElement) document.exitPointerLock();
    mode = newMode();
    camera.reset();
    ui.message.textContent = message || '';
    syncMenu();
    show('menu');
    drawFrame(performance.now());
  }

  // ---------- Captura do mouse ----------

  // Pede o mouse "cru" (sem aceleração do sistema), como os jogos fazem.
  async function lockPointer() {
    try {
      await ui.canvas.requestPointerLock({ unadjustedMovement: true });
      rawInput = true;
    } catch (err) {
      if (err.name !== 'NotSupportedError') throw err;
      await ui.canvas.requestPointerLock();
      rawInput = false;
    }
  }

  async function startRun() {
    try {
      await lockPointer();
    } catch {
      backToMenu('Não consegui capturar o mouse. Espere um segundo e clique em Jogar de novo.');
      return;
    }
    camera.reset();
    mode = newMode();
    state = 'countdown';
    countdownStart = performance.now();
    show('hud');
    requestAnimationFrame(frame);
  }

  function onPointerLockChange() {
    if (document.pointerLockElement !== ui.canvas && isRunning()) {
      backToMenu('Treino cancelado (Esc).');
    }
  }

  // ---------- Loop ----------

  function frame(now) {
    if (!isRunning()) return; // fora do treino nada roda: zero uso de CPU/GPU

    if (state === 'countdown') {
      const left = COUNTDOWN_S - (now - countdownStart) / 1000;
      if (left <= 0) {
        state = 'playing';
        mode.start(now);
        ui.countdown.hidden = true;
      } else {
        ui.countdown.textContent = Math.ceil(left);
      }
    }

    if (state === 'playing') {
      mode.update(now);
      if (mode.finished) {
        finishRun();
        return;
      }
    }

    drawFrame(now);
    requestAnimationFrame(frame);
  }

  function drawFrame(now) {
    renderer.draw(mode, now, settings.crosshair);
    if (!isRunning()) return;
    ui.hudTime.textContent = Math.ceil(mode.duration - mode.elapsed);
    ui.hudScore.textContent = mode.score;
    ui.hudAcc.textContent = `${Math.round(mode.accuracy * 100)}%`;
  }

  function finishRun() {
    state = 'results';
    document.exitPointerLock();
    const isRecord = Aim.submitScore(settings, mode.score);
    $('r-score').textContent = mode.score;
    $('r-hits').textContent = `${mode.hits} / ${mode.shots}`;
    $('r-acc').textContent = `${(mode.accuracy * 100).toFixed(1)}%`;
    $('r-avg').textContent = mode.hits ? `${Math.round(mode.avgKillMs)} ms` : '—';
    $('r-best').textContent = Aim.getBest(settings) + (isRecord ? '  ★ novo recorde!' : '');
    $('r-raw').hidden = rawInput;
    show('results');
    renderer.draw(mode, performance.now(), settings.crosshair);
  }

  // ---------- Som ----------

  function blip(freq, seconds, volume) {
    if (!settings.sound) return;
    audio = audio || new AudioContext();
    const t = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + seconds);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + seconds);
  }

  // ---------- Eventos ----------

  document.addEventListener('mousemove', (e) => {
    if (!isRunning() || document.pointerLockElement !== ui.canvas) return;
    const game = GAMES[settings.game];
    camera.rotate(e.movementX, e.movementY, game.yaw * settings.sens[settings.game]);
  });

  document.addEventListener('mousedown', (e) => {
    if (state !== 'playing' || e.button !== 0) return;
    if (mode.shoot(camera, performance.now())) blip(880, 0.07, 0.12);
    else blip(180, 0.05, 0.06);
  });

  document.addEventListener('pointerlockchange', onPointerLockChange);
  document.addEventListener('contextmenu', (e) => {
    if (isRunning()) e.preventDefault();
  });
  window.addEventListener('resize', () => {
    renderer.resize(GAMES[settings.game].hfov);
    if (!isRunning()) drawFrame(performance.now());
  });

  ui.menu.addEventListener('change', onSettingsChange);
  $('play').addEventListener('click', startRun);
  $('again').addEventListener('click', startRun);
  $('back').addEventListener('click', () => backToMenu());

  // ---------- Início ----------

  fillSelect(ui.game, Object.entries(GAMES).map(([id, g]) => [id, g.label]));
  fillSelect(ui.size, Object.entries(TARGET_SIZES).map(([id, s]) => [id, s.label]));
  fillSelect(ui.duration, [[30, '30 s'], [60, '60 s'], [120, '120 s']]);
  renderer.resize(GAMES[settings.game].hfov);
  backToMenu();
})();
