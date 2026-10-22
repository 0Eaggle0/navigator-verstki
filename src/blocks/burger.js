// БУРГЕР-МЕНЮ. Вставь в script.js
const burger = document.querySelector('.burger');
const menu = document.querySelector('.menu');

burger.addEventListener('click', function () {
  // toggle вернёт true, если меню открылось
  const isOpen = menu.classList.toggle('open');
  burger.setAttribute('aria-expanded', isOpen);
  burger.setAttribute('aria-label', isOpen ? 'Закрыть меню' : 'Открыть меню');
});
