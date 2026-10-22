// БУРГЕР-МЕНЮ. Вставь в script.js
const burger = document.querySelector('.burger');
const menu = document.querySelector('.menu');

burger.addEventListener('click', function () {
  // toggle вернёт true, если меню открылось
  const isOpen = menu.classList.toggle('open');
  burger.setAttribute('aria-expanded', isOpen);
  burger.setAttribute('aria-label', isOpen ? 'Закрыть меню' : 'Открыть меню');
});

// Форма «Стать волонтёром» — проверка полей (решение шага 7.1)
const form = document.querySelector('.form');
const error = form.querySelector('.error');

form.addEventListener('submit', function (event) {
  event.preventDefault();
  const name = form.elements.name.value.trim();
  // оставляем в телефоне только цифры
  const phone = form.elements.phone.value.replace(/\D/g, '');

  if (name === '') {
    error.textContent = 'Напиши своё имя';
    return;
  }
  if (phone.length < 10) {
    error.textContent = 'В телефоне должно быть хотя бы 10 цифр';
    return;
  }
  if (!form.elements.agree.checked) {
    error.textContent = 'Поставь галочку согласия';
    return;
  }
  form.innerHTML = '<p>Спасибо, мы позвоним!</p>';
});
