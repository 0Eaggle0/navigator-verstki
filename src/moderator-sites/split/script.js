// Сплит: бургер-меню, окно «Добавить расход», сплит чека и «Напомнить»

// Бургер-меню на телефоне
const burger = document.querySelector('.burger');
const menu = document.querySelector('.menu');
burger.addEventListener('click', function () {
  const isOpen = menu.classList.toggle('open');
  burger.setAttribute('aria-expanded', isOpen);
});

// Окно «Добавить расход» с проверкой полей
const modal = document.querySelector('.modal');
const modalForm = document.querySelector('.modal__form');
const modalError = document.querySelector('.modal__error');
document.querySelector('[data-open-expense]').addEventListener('click', function () {
  modal.showModal();
});
document.querySelector('[data-close]').addEventListener('click', function () {
  modal.close();
});
modalForm.addEventListener('submit', function (event) {
  const title = modalForm.elements.title.value.trim();
  const sum = Number(modalForm.elements.sum.value);
  if (!title || !(sum > 0)) {
    event.preventDefault();
    modalError.hidden = false;
    return;
  }
  modalError.hidden = true;
  addToFeed(title, sum);
  modalForm.reset();
});

// Новый расход появляется первым в «Последних операциях» и сохраняется в браузере
const feed = document.querySelector('.feed');
function addToFeed(title, sum, save = true) {
  const li = document.createElement('li');
  li.innerHTML = '<span class="feed__icon feed__icon--pink"></span><p><b></b><span class="small">Вы оплатили • Сейчас</span></p><p class="feed__sum accent"></p>';
  li.querySelector('b').textContent = title;
  li.querySelector('.feed__sum').textContent = '+' + sum.toLocaleString('ru-RU') + ' ₽';
  feed.prepend(li);
  if (!save) return;
  try {
    const list = JSON.parse(localStorage.getItem('split-expenses') || '[]');
    list.push({ title: title, sum: sum });
    localStorage.setItem('split-expenses', JSON.stringify(list));
  } catch (e) {}
}
try {
  JSON.parse(localStorage.getItem('split-expenses') || '[]').forEach(function (item) {
    addToFeed(item.title, item.sum, false);
  });
} catch (e) {}

// Быстрый сплит: сумма чека делится на число людей
const splitForm = document.querySelector('.split-form');
const result = document.querySelector('.split-form__result');
splitForm.addEventListener('submit', function (event) {
  event.preventDefault();
  const sum = Number(splitForm.elements.sum.value);
  const people = Number(splitForm.elements.people.value);
  if (!(sum > 0) || !(people >= 2)) {
    result.textContent = 'Введи сумму чека и минимум 2 человека';
    return;
  }
  const share = Math.ceil(sum / people);
  result.textContent = 'Каждый платит по ' + share.toLocaleString('ru-RU') + ' ₽';
});

// «Напомнить» — кнопка меняет текст, чтобы было видно, что напоминание ушло
document.querySelector('[data-remind]').addEventListener('click', function (event) {
  event.currentTarget.lastChild.textContent = ' Напомнили ✓';
});
