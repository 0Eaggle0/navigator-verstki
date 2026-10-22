// КУДА_СХОДИТЬ: фильтр событий, «Иду» с сохранением, «Поделиться» и окно «Предложить событие»

const events = document.querySelectorAll('.event');
const filters = document.querySelectorAll('.filter');
const count = document.querySelector('.found__count');
const empty = document.querySelector('.empty');

// Подходит ли событие под фильтр
function matches(event, filter) {
  if (filter === 'all') return true;
  if (filter === 'free') return event.dataset.price === '0';
  if (filter === 'near') return event.dataset.near === 'yes';
  return event.dataset.cat === filter;
}

function applyFilter(filter) {
  let shown = 0;
  events.forEach(function (event) {
    event.hidden = !matches(event, filter);
    if (!event.hidden) shown++;
  });
  count.textContent = shown;
  empty.hidden = shown > 0;
  filters.forEach(function (button) {
    button.classList.toggle('filter--active', button.dataset.filter === filter);
  });
}

filters.forEach(function (button) {
  button.addEventListener('click', function () {
    applyFilter(button.dataset.filter);
  });
});
// По макету сразу выбран фильтр «Бесплатно»
applyFilter('free');

// «Иду» — список событий сохраняется в браузере
const goingCount = document.querySelector('.going-count');
let going = [];
try {
  going = JSON.parse(localStorage.getItem('omsk-going') || '[]');
} catch (e) {}

function showGoing() {
  events.forEach(function (event) {
    const pressed = going.includes(event.dataset.id);
    event.querySelector('.going').setAttribute('aria-pressed', pressed);
  });
  goingCount.textContent = going.length;
  goingCount.hidden = going.length === 0;
}

events.forEach(function (event) {
  event.querySelector('.going').addEventListener('click', function () {
    const id = event.dataset.id;
    going = going.includes(id) ? going.filter((x) => x !== id) : [...going, id];
    try {
      localStorage.setItem('omsk-going', JSON.stringify(going));
    } catch (e) {}
    showGoing();
  });
});
showGoing();

// «Поделиться» — копируем название события и показываем уведомление
const toast = document.querySelector('.toast');
function showToast(text) {
  toast.textContent = text;
  toast.hidden = false;
  setTimeout(function () {
    toast.hidden = true;
  }, 2000);
}
events.forEach(function (event) {
  event.querySelector('.share').addEventListener('click', async function () {
    const title = event.querySelector('h3').textContent;
    try {
      await navigator.clipboard.writeText(title + ' — нашёл на КУДА_СХОДИТЬ');
      showToast('Скопировано — отправь другу');
    } catch (e) {
      showToast('Не получилось скопировать');
    }
  });
});

// Окно «Предложить событие» с проверкой полей
const modal = document.querySelector('.modal');
const form = document.querySelector('.modal__form');
const error = document.querySelector('.modal__error');
document.querySelector('[data-open-suggest]').addEventListener('click', function () {
  modal.showModal();
});
document.querySelector('[data-close]').addEventListener('click', function () {
  modal.close();
});
form.addEventListener('submit', function (event) {
  const ok = ['title', 'date', 'place'].every((name) => form.elements[name].value.trim() !== '');
  if (!ok) {
    event.preventDefault();
    error.hidden = false;
    return;
  }
  error.hidden = true;
  form.reset();
  showToast('Спасибо! Проверим и добавим в афишу');
});
