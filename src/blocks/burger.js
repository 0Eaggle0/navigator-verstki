// БУРГЕР-МЕНЮ. Вставь в script.js
const burger = document.querySelector('.bheader__burger');
const burgerMenu = document.querySelector('.bheader__menu');

burger.addEventListener('click', function () {
  // toggle вернёт true, если меню открылось
  const isOpen = burgerMenu.classList.toggle('open');
  burger.setAttribute('aria-expanded', isOpen);
  burger.setAttribute('aria-label', isOpen ? 'Закрыть меню' : 'Открыть меню');
});
