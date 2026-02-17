// BrainScreen - main entry point

const GAME_DURATION = 60;

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

function fitText($el, maxWidth) {
  let lo = 1;
  let hi = 500;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    $el.css('font-size', mid + 'px');
    if ($el[0].scrollWidth > maxWidth) {
      hi = mid - 1;
    } else {
      lo = mid;
    }
  }
  $el.css('font-size', lo + 'px');
}

// Game state
let gameState = null;

function showWord() {
  const $word = $('#game-word');
  const word = gameState.words[gameState.wordIndex];
  $word.text(word);
  fitText($word, gameState.containerWidth);
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

function endGame() {
  clearInterval(gameState.timerInterval);
  new Audio('sounds/gameover.wav').play();
  alert(`Time's up! You got ${gameState.correctAnswers.length} correct!`);
  screens.show('menu');
  gameState = null;
}

async function startGame(category) {
  const response = await fetch(`game-data/${category}.json`);
  const words = await response.json();

  screens.show('game');

  const containerWidth = $('#game-word-wrap').width();

  gameState = {
    words: shuffle(words),
    wordIndex: 0,
    correctAnswers: [],
    skippedAnswers: [],
    timeRemaining: GAME_DURATION,
    containerWidth,
    timerInterval: null,
    tickingPlayed: false,
  };

  $('#game-timer').text(gameState.timeRemaining);
  showWord();

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
  $('.category-list').on('click', '[data-category]', function () {
    const category = $(this).data('category');
    startCountdown(category);
  });
});
