// BrainScreen - main entry point

const APP_VERSION = 'v0.1.1a';
const GAME_DURATION = 16;

const screens = {
  show(id) {
    $('#app > .screen').addClass('is-hidden');
    $(`#screen-${id}`).removeClass('is-hidden');
  }
};

function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fitText($el, maxWidth, maxHeight) {
  let lo = 1;
  let hi = 500;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    $el.css('font-size', mid + 'px');
    if ($el[0].scrollWidth > maxWidth || $el[0].scrollHeight > maxHeight) {
      hi = mid - 1;
    } else {
      lo = mid;
    }
  }
  $el.css('font-size', lo + 'px');
}

// Tilt detection via acceleration spikes
const ACCEL_THRESHOLD = 4;     // m/s² — spike magnitude to register a tilt
const TILT_COOLDOWN = 1000;    // ms before next tilt registers

let tiltCooldown = false;

function handleMotion(event) {
  const a = event.acceleration || {};
  const x = a.x ?? 0;
  const y = a.y ?? 0;
  const z = a.z ?? 0;
  $('#debug-info').text(`x:${x.toFixed(1)} y:${y.toFixed(1)} z:${z.toFixed(1)}`);

  if (!gameState || tiltCooldown) return;

  // Phone is in landscape on forehead, screen facing out.
  // Tilting forward (nod down, correct) produces a positive z spike.
  // Tilting backward (look up, skip) produces a negative z spike.
  if (z > ACCEL_THRESHOLD) {
    triggerAction(false);  // skip
  } else if (z < -ACCEL_THRESHOLD) {
    triggerAction(true);   // correct
  }
}

function triggerAction(correct) {
  tiltCooldown = true;

  if (correct) {
    new Audio('sounds/correct.mp3').play();
  } else {
    new Audio('sounds/skip.mp3').play();
  }

  nextWord(correct);

  setTimeout(() => {
    tiltCooldown = false;
  }, TILT_COOLDOWN);
}

function startTiltDetection() {
  window.addEventListener('devicemotion', handleMotion);
}

function stopTiltDetection() {
  window.removeEventListener('devicemotion', handleMotion);
}

async function requestMotionPermission() {
  try {
    if (typeof DeviceMotionEvent !== 'undefined' &&
        typeof DeviceMotionEvent.requestPermission === 'function') {
      await DeviceMotionEvent.requestPermission();
    }
  } catch (e) {
    $('#debug-info').text(`Sensor error: ${e.message || e}`);
  }
}

// Game state
let gameState = null;

function showWord() {
  const $word = $('#game-word');
  const word = gameState.words[gameState.wordIndex];
  $word.text(word);
  fitText($word, gameState.containerWidth * 0.9, gameState.containerHeight);
}

function nextWord(correct) {
  const current = gameState.words[gameState.wordIndex];
  if (correct) {
    gameState.correctAnswers.push(current);
  } else {
    gameState.skippedAnswers.push(current);
  }

  gameState.wordIndex++;
  if (gameState.wordIndex < gameState.words.length) {
    showWord();
  }
}

function showResults() {
  const correct = gameState.correctAnswers;
  const skipped = gameState.skippedAnswers;

  $('#results-summary').text(
    `${correct.length} Correct, ${skipped.length} Skipped`
  );

  const $list = $('#results-list').empty();
  const allItems = [
    ...correct.map(w => ({ word: w, correct: true })),
    ...skipped.map(w => ({ word: w, correct: false })),
  ];

  for (const item of allItems) {
    const colorClass = item.correct ? 'has-text-success' : '';
    $list.append(
      `<p class="is-size-5 has-text-centered ${colorClass}">${$('<span>').text(item.word).html()}</p>`
    );
  }

  screens.show('results');
  $('#debug-info').text(APP_VERSION);
}

function endGame() {
  clearInterval(gameState.timerInterval);
  stopTiltDetection();
  // Count the current word on screen as skipped
  const current = gameState.words[gameState.wordIndex];
  if (current) {
    gameState.skippedAnswers.push(current);
  }
  new Audio('sounds/gameover.mp3').play();
  showResults();
}

async function startGame(category) {
  const response = await fetch(`game-data/${category}.json`);
  const words = await response.json();

  screens.show('game');

  const $wrap = $('#game-word-wrap');
  const containerWidth = $wrap.width();
  const containerHeight = $wrap.height();

  gameState = {
    words: shuffle(words),
    wordIndex: 0,
    correctAnswers: [],
    skippedAnswers: [],
    timeRemaining: GAME_DURATION,
    containerWidth,
    containerHeight,
    timerInterval: null,
    tickingPlayed: false,
  };

  $('#game-timer').text(gameState.timeRemaining);
  showWord();
  startTiltDetection();

  gameState.timerInterval = setInterval(() => {
    gameState.timeRemaining--;
    $('#game-timer').text(gameState.timeRemaining);

    if (gameState.timeRemaining === 15 && !gameState.tickingPlayed) {
      gameState.tickingPlayed = true;
      new Audio('sounds/ticking.mp3').play();
    }

    if (gameState.timeRemaining <= 0) {
      endGame();
    }
  }, 1000);
}

function startCountdown(category) {
  screens.show('countdown');

  const steps = [
    { text: '3', color: 'has-text-danger' },
    { text: '2', color: 'has-text-warning' },
    { text: '1', color: 'has-text-success' },
    { text: 'Go!', color: 'has-text-white' },
  ];
  let i = 0;
  const $num = $('#countdown-number');
  const allColors = steps.map(s => s.color).join(' ');

  const countdownSound = new Audio('sounds/countdown-starting.mp3');

  $num.text(steps[i].text).removeClass(allColors).addClass(steps[i].color);
  countdownSound.cloneNode().play();

  const interval = setInterval(() => {
    i++;
    if (i < steps.length) {
      $num.text(steps[i].text).removeClass(allColors).addClass(steps[i].color);
      countdownSound.cloneNode().play();
    } else {
      clearInterval(interval);
      startGame(category);
    }
  }, 1000);
}

$(function () {
  $('#debug-info').text(APP_VERSION);

  $('.category-list').on('click', '[data-category]', async function () {
    const category = $(this).data('category');
    await requestMotionPermission();
    startCountdown(category);
  });

  $('#results-menu-btn').on('click', function () {
    gameState = null;
    screens.show('menu');
  });
});
