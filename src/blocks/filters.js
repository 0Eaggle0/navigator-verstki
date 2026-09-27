// ФИЛЬТРЫ КАРТОЧЕК. Вставь в script.js
const filterButtons = document.querySelectorAll('.filters__btn');
const eventCards = document.querySelectorAll('.event');

filterButtons.forEach(function (button) {
  button.addEventListener('click', function () {
    const filter = button.dataset.filter;

    // Показываем карточки нужного типа, остальные прячем
    eventCards.forEach(function (card) {
      card.hidden = filter !== 'all' && card.dataset.type !== filter;
    });

    // Выделяем нажатую кнопку
    filterButtons.forEach((b) => b.classList.remove('active'));
    button.classList.add('active');
  });
});
