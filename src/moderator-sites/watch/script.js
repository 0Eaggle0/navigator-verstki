// Киносфера: бургер-меню, окно «Создать комнату», настроения, «Мой список» и стрелки каталога

// Бургер-меню на телефоне
const burger = document.querySelector('.burger');
const menu = document.querySelector('.menu');
burger.addEventListener('click', function () {
  const isOpen = menu.classList.toggle('open');
  burger.setAttribute('aria-expanded', isOpen);
});

// Окно «Создать комнату»: открывают все кнопки с атрибутом data-open-room
const modal = document.querySelector('.modal');
const form = document.querySelector('.modal__form');
const error = document.querySelector('.modal__error');
document.querySelectorAll('[data-open-room]').forEach(function (button) {
  button.addEventListener('click', function () {
    modal.showModal();
  });
});
document.querySelector('[data-close]').addEventListener('click', function () {
  modal.close();
});
form.addEventListener('submit', function (event) {
  const room = form.elements.room.value.trim();
  const name = form.elements.name.value.trim();
  if (!room || !name) {
    event.preventDefault(); // окно не закрываем — показываем ошибку
    error.hidden = false;
    return;
  }
  error.hidden = true;
  alert('Комната «' + room + '» создана! Отправь ссылку друзьям.');
  form.reset();
});

// Настроения: можно выбрать несколько
document.querySelectorAll('.mood').forEach(function (mood) {
  mood.addEventListener('click', function () {
    mood.classList.toggle('is-active');
  });
});

// Кнопка «в мой список» запоминается в браузере
const bookmark = document.querySelector('.bookmark');
const counter = document.querySelector('.my-list-count');
let saved = false;
try {
  saved = localStorage.getItem('kinosphere-dune') === 'yes';
} catch (e) {}
function showBookmark() {
  bookmark.setAttribute('aria-pressed', saved);
  counter.textContent = saved ? 15 : 14;
}
showBookmark();
bookmark.addEventListener('click', function () {
  saved = !saved;
  try {
    localStorage.setItem('kinosphere-dune', saved ? 'yes' : 'no');
  } catch (e) {}
  showBookmark();
});

// Стрелки «Новинок» листают карточки (на узком экране, где они в одну колонку, — к следующей)
const cards = document.querySelector('.cards');
document.querySelectorAll('[data-scroll]').forEach(function (button) {
  button.addEventListener('click', function () {
    const step = cards.firstElementChild.offsetWidth + 20;
    cards.scrollBy({ left: step * Number(button.dataset.scroll), behavior: 'smooth' });
  });
});
