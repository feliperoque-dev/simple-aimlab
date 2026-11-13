// Liga tudo: menu, configurações, captura do mouse, loop do treino e resultado.
(function () {
  const { GAMES, MODES, DIFFICULTIES, DURATIONS, MOVEMENTS } = Aim;
  const COUNTDOWN_S = 3;
  const CHART_RUNS = 20;

  const $ = (id) => document.getElementById(id);
  const ui = {
    canvas: $('view'),
    panels: { menu: $('menu'), settings: $('settings'), results: $('results'), hud: $('hud') },
    countdown: $('countdown'),
    // menu
    modeCards: $('mode-cards'),
    difficulty: $('difficulty'),
    duration: $('duration'),
    movement: $('movement'),
    movementBox: $('movement-box'),
    best: $('best'),
    menuChart: $('menu-chart'),
    message: $('menu-msg'),
    openSettings: $('open-settings'),
    // configurações
    game: $('game'),
    sens: $('sens'),
    dpi: $('dpi'),
    cm360: $('cm360'),
    preview: $('crosshair-preview'),
    chColor: $('ch-color'),
    chLength: $('ch-length'),
    chThickness: $('ch-thickness'),
    chGap: $('ch-gap'),
    chDot: $('ch-dot'),
    sound: $('sound'),
    hold: $('hold'),
    // hud
    hudTime: $('hud-time'),
    hudScore: $('hud-score'),
    hudAcc: $('hud-acc'),
  };

  const settings = Aim.loadSettings();
  if (!MODES[settings.mode]) settings.mode = 'gridshot';

  const camera = new Aim.Camera();
  const renderer = new Aim.Renderer(ui.canvas, camera);

  let state = 'menu'; // menu | countdown | playing | results
  let mode = newMode();
  let countdownStart = 0;
  let firing = false; // botão esquerdo pressionado
  let starting = false; // captura do mouse em andamento
  let rawInput = true;
  let audio = null;

  function newMode() {
    const difficulty = DIFFICULTIES[settings.difficulty];
    return MODES[settings.mode].create({
      radius: difficulty.radius,
      speed: difficulty.speed,
      duration: settings.duration,
      holdToTrack: settings.holdToTrack,
      movement: settings.movement,
    });
  }

  function isRunning() {
    return state === 'countdown' || state === 'playing';
  }

  function show(panel) {
    for (const [name, element] of Object.entries(ui.panels)) element.hidden = name !== panel;
    ui.countdown.hidden = state !== 'countdown';
  }

  // ---------- Menu ----------

  // Cria um botão por opção; clicar grava o valor em settings[key].
  // options = [[valor, título, descrição opcional], ...]
  function buildChoices(container, key, options) {
    for (const [value, label, description] of options) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.value = value;
      const title = document.createElement('b');
      title.textContent = label;
      button.append(title);
      if (description) {
        const text = document.createElement('span');
        text.textContent = description;
        button.append(text);
      }
      button.addEventListener('click', () => {
        settings[key] = value;
        onMenuChange();
      });
      container.append(button);
    }
  }

  function markChoice(container, value) {
    for (const button of container.children) {
      button.setAttribute('aria-pressed', button.dataset.value === String(value));
    }
  }

  function syncMenu() {
    markChoice(ui.modeCards, settings.mode);
    markChoice(ui.difficulty, settings.difficulty);
    markChoice(ui.duration, settings.duration);
    markChoice(ui.movement, settings.movement);
    ui.movementBox.hidden = settings.mode !== 'tracking';
    ui.best.textContent = Aim.getBest(settings);
    renderChart(ui.menuChart, Aim.getRuns(settings, CHART_RUNS), false);
    const sens = settings.sens[settings.game];
    ui.openSettings.textContent = `Configurações · ${GAMES[settings.game].label} ${sens}`;
  }

  function onMenuChange() {
    Aim.saveSettings(settings);
    syncMenu();
    mode = newMode();
    drawFrame(performance.now());
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

  // Barras com os pontos das últimas partidas na configuração atual.
  function renderChart(figure, runs, highlightLatest) {
    figure.replaceChildren();
    figure.hidden = runs.length < 2;
    if (figure.hidden) return;

    const caption = document.createElement('figcaption');
    caption.textContent = `Pontos nas últimas ${runs.length} partidas desta configuração`;

    const recent = runs.slice(-5);
    const average = Math.round(recent.reduce((sum, r) => sum + r.score, 0) / recent.length);
    const idleText = `Média das últimas ${recent.length}: ${average} pontos`;
    const readout = document.createElement('p');
    readout.className = 'readout';
    readout.textContent = idleText;

    const bars = document.createElement('div');
    bars.className = 'bars';
    const max = Math.max(1, ...runs.map((r) => r.score));
    runs.forEach((run, i) => {
      const bar = document.createElement('div');
      bar.className = 'bar';
      if (highlightLatest && i === runs.length - 1) bar.classList.add('latest');
      bar.style.height = `${(run.score / max) * 100}%`;
      const date = new Date(run.t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const detail = `${run.score} pontos · ${Math.round(run.acc * 100)}% de precisão · ${date}`;
      bar.addEventListener('mouseenter', () => (readout.textContent = detail));
      bar.addEventListener('mouseleave', () => (readout.textContent = idleText));
      bars.append(bar);
    });

    figure.append(caption, bars, readout);
  }

  // ---------- Configurações ----------

  function fillSettingsForm() {
    for (const [id, game] of Object.entries(GAMES)) ui.game.add(new Option(game.label, id));
    ui.game.value = settings.game;
    ui.sens.value = settings.sens[settings.game];
    ui.dpi.value = settings.dpi;
    ui.chColor.value = settings.crosshair.color;
    ui.chLength.value = settings.crosshair.length;
    ui.chThickness.value = settings.crosshair.thickness;
    ui.chGap.value = settings.crosshair.gap;
    ui.chDot.checked = settings.crosshair.dot;
    ui.sound.checked = settings.sound;
    ui.hold.checked = settings.holdToTrack;
  }

  // Roda a cada tecla/arraste. Não reescreve os campos para não atrapalhar a digitação.
  function onSettingsInput(event) {
    const positive = (input, fallback) => {
      const n = parseFloat(input.value);
      return n > 0 ? n : fallback;
    };
    if (event.target === ui.game) {
      settings.game = ui.game.value;
      ui.sens.value = settings.sens[settings.game]; // cada jogo guarda a sua sensibilidade
      renderer.resize(GAMES[settings.game].hfov);
    } else {
      settings.sens[settings.game] = positive(ui.sens, settings.sens[settings.game]);
    }
    settings.dpi = positive(ui.dpi, settings.dpi);
    settings.crosshair = {
      color: ui.chColor.value,
      length: Number(ui.chLength.value),
      thickness: Number(ui.chThickness.value),
      gap: Number(ui.chGap.value),
      dot: ui.chDot.checked,
    };
    settings.sound = ui.sound.checked;
    settings.holdToTrack = ui.hold.checked;
    Aim.saveSettings(settings);
    syncSettings();
  }

  function syncSettings() {
    const cm = Aim.cm360(settings.game, settings.sens[settings.game], settings.dpi);
    ui.cm360.textContent = isFinite(cm) ? `${cm.toFixed(1)} cm/360°` : '—';

    const ctx = ui.preview.getContext('2d');
    const { width, height } = ui.preview;
    ctx.clearRect(0, 0, width, height);
    Aim.drawCrosshair(ctx, width / 2, height / 2, settings.crosshair, 1);
  }

  // ---------- Captura do mouse ----------

  // Pede o mouse "cru" (sem aceleração do sistema), como os jogos fazem.
  async function lockPointer() {
    if (document.pointerLockElement === ui.canvas) return;
    try {
      await ui.canvas.requestPointerLock({ unadjustedMovement: true });
      rawInput = true;
    } catch (err) {
      if (err.name !== 'NotSupportedError') throw err;
      await ui.canvas.requestPointerLock();
      rawInput = false;
    }
  }

  // Começa (ou recomeça) o treino. Se o mouse já está capturado, só zera tudo.
  async function startRun() {
    if (starting) return;
    starting = true;
    try {
      await lockPointer();
    } catch {
      backToMenu('Não consegui capturar o mouse. Espere um segundo e clique em Jogar de novo.');
      return;
    } finally {
      starting = false;
    }
    const wasRunning = isRunning();
    camera.reset();
    mode = newMode();
    firing = false;
    state = 'countdown';
    countdownStart = performance.now();
    show('hud');
    if (!wasRunning) requestAnimationFrame(frame);
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
      mode.update(now, camera, firing);
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
    const isRecord = Aim.saveRun(settings, mode.score, mode.accuracy);

    const rows = [
      ['Pontos', mode.score],
      ...mode.results(),
      ['Recorde', Aim.getBest(settings) + (isRecord ? '  ★ novo recorde!' : '')],
    ];
    const list = $('r-list');
    list.replaceChildren();
    for (const [label, value] of rows) {
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = label;
      dd.textContent = value;
      list.append(dt, dd);
    }
    const difficulty = DIFFICULTIES[settings.difficulty].label;
    const movement = settings.mode === 'tracking' ? ` · ${MOVEMENTS[settings.movement].label}` : '';
    $('r-title').textContent = `${MODES[settings.mode].label}${movement} · ${difficulty} · ${settings.duration} s`;
    $('r-raw').hidden = rawInput;
    renderChart($('r-chart'), Aim.getRuns(settings, CHART_RUNS), true);

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
    if (e.button !== 0) return;
    firing = true;
    if (state !== 'playing') return;
    const hit = mode.shoot(camera, performance.now()); // null = treino sem clique
    if (hit === true) blip(880, 0.07, 0.12);
    else if (hit === false) blip(180, 0.05, 0.06);
  });

  document.addEventListener('mouseup', (e) => {
    if (e.button === 0) firing = false;
  });

  document.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const restart = e.code === 'KeyR' && (isRunning() || state === 'results');
    const again = e.code === 'Space' && state === 'results';
    if (restart || again) {
      e.preventDefault();
      startRun();
    }
  });

  document.addEventListener('pointerlockchange', onPointerLockChange);
  document.addEventListener('contextmenu', (e) => {
    if (isRunning()) e.preventDefault();
  });
  window.addEventListener('resize', () => {
    renderer.resize(GAMES[settings.game].hfov);
    if (!isRunning()) drawFrame(performance.now());
  });

  ui.panels.settings.addEventListener('input', onSettingsInput);
  ui.openSettings.addEventListener('click', () => show('settings'));
  $('close-settings').addEventListener('click', () => backToMenu());
  $('play').addEventListener('click', startRun);
  $('again').addEventListener('click', startRun);
  $('back').addEventListener('click', () => backToMenu());

  // ---------- Início ----------

  buildChoices(ui.modeCards, 'mode', Object.entries(MODES).map(([id, m]) => [id, m.label, m.description]));
  buildChoices(ui.difficulty, 'difficulty', Object.entries(DIFFICULTIES).map(([id, d]) => [id, d.label]));
  buildChoices(ui.movement, 'movement', Object.entries(MOVEMENTS).map(([id, m]) => [id, m.label]));
  buildChoices(ui.duration, 'duration', DURATIONS.map((seconds) => [seconds, `${seconds} s`]));
  fillSettingsForm();
  syncSettings();
  renderer.resize(GAMES[settings.game].hfov);
  backToMenu();
})();
