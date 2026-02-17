// BrainScreen - main entry point

const screens = {
  show(id) {
    $('#app > .screen').addClass('is-hidden');
    $(`#screen-${id}`).removeClass('is-hidden');
  }
};

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

  $num.text(steps[i].text).removeClass(allColors).addClass(steps[i].color);

  const interval = setInterval(() => {
    i++;
    if (i < steps.length) {
      $num.text(steps[i].text).removeClass(allColors).addClass(steps[i].color);
    } else {
      clearInterval(interval);
      alert('Game Start!');
      screens.show('menu');
    }
  }, 1000);
}

$(function () {
  $('.category-list').on('click', '[data-category]', function () {
    const category = $(this).data('category');
    startCountdown(category);
  });
});
