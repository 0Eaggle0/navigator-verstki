const burger = document.querySelector('.burger');
const menu = document.querySelector('.menu');
function setMenu(open) {
  menu.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
}
burger.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
menu.addEventListener('click', event => {
  if (event.target.closest('a')) setMenu(false);
});

const pets = new Map([...document.querySelectorAll('.card[id]')].map(card => [card.id, {
  name: card.querySelector('h3').textContent,
  description: card.querySelector('p').textContent,
  image: card.querySelector('img')
}]));

function recommend(answers) {
  if (answers.species !== 'cat' && answers.walk === 'yes'
    && (answers.species === 'dog' || answers.pace === 'active')) return 'sharik';
  if (answers.pace === 'calm' && (answers.home === 'lap' || answers.experience === 'no')) return 'murka';
  return 'barsik';
}

const quiz = document.querySelector('#quiz');
const result = document.querySelector('#quiz-result');
const resultButton = document.querySelector('#quiz-pet');
quiz.addEventListener('submit', event => {
  event.preventDefault();
  const answers = Object.fromEntries(new FormData(quiz));
  const id = recommend(answers);
  const hint = answers.species === 'dog' && answers.walk === 'no' ? 'Шарику нужны ежедневные прогулки. Начни со знакомства с кошкой: ' : 'Начни знакомство с питомцем: ';
  const pet = pets.get(id);
  result.textContent = hint + pet.name + ' — ' + pet.description + '.';
  result.hidden = false;
  resultButton.dataset.pet = id;
  resultButton.hidden = false;
});
quiz.addEventListener('change', () => {
  result.hidden = true;
  resultButton.hidden = true;
});

const dialog = document.querySelector('.pet-dialog');
const petForm = document.querySelector('#pet-form');
let selectedPet;
document.querySelectorAll('[data-pet]').forEach(button => button.addEventListener('click', () => {
  selectedPet = button.dataset.pet;
  const pet = pets.get(selectedPet);
  const image = dialog.querySelector('img');
  image.src = pet.image.src;
  image.alt = pet.image.alt;
  dialog.querySelector('#pet-name').textContent = pet.name;
  dialog.querySelector('#pet-description').textContent = pet.description;
  petForm.reset();
  petForm.querySelector('.error').textContent = '';
  dialog.showModal();
}));
dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());

const volunteer = document.querySelector('#volunteer-form');
const key = 'tail-requests-v1';
const helpOptions = [...volunteer.elements.help.options].map(option => option.value);
const list = document.querySelector('#request-list');
const validName = name => typeof name === 'string' && !!name.trim() && name.length <= 60;
function readRequests() {
  const entries = JSON.parse(localStorage.getItem(key) || '[]');
  if (!Array.isArray(entries) || entries.some(item => !item || !validName(item.name)
    || !(item.kind === 'pet' && pets.has(item.choice) || item.kind === 'volunteer' && helpOptions.includes(item.choice)))) {
    throw new Error('Некорректные данные');
  }
  return entries;
}

function showRequests() {
  list.replaceChildren();
  function appendRow(text) {
    const row = document.createElement('li');
    row.textContent = text;
    list.append(row);
  }
  try {
    const entries = readRequests();
    for (const item of entries.slice().reverse()) {
      const subject = item.kind === 'pet' ? 'Знакомство: ' + pets.get(item.choice).name : 'Волонтёрство: ' + item.choice;
      appendRow(subject + ' · ' + item.name);
    }
    if (!entries.length) appendRow('Заявок пока нет.');
  } catch {
    appendRow('Не удалось прочитать сохранённые заявки.');
  }
}

function submitRequest(form, kind, choice) {
  const name = form.elements.name.value.trim();
  const status = form.querySelector('.error');
  if (!validName(name)) { status.textContent = 'Введи имя длиной до 60 символов.'; return; }
  try {
    const entries = readRequests();
    entries.push({ kind, name, choice });
    localStorage.setItem(key, JSON.stringify(entries));
  } catch {
    status.textContent = 'Сохранение недоступно. Данные остались в форме.';
    return;
  }
  form.reset();
  status.textContent = 'Заявка сохранена. Её можно открыть в разделе «Мои заявки».';
  showRequests();
}

petForm.addEventListener('submit', event => {
  event.preventDefault();
  submitRequest(petForm, 'pet', selectedPet);
});
volunteer.addEventListener('submit', event => {
  event.preventDefault();
  submitRequest(volunteer, 'volunteer', volunteer.elements.help.value);
});
window.addEventListener('storage', event => {
  if (event.key === key || event.key === null) showRequests();
});
showRequests();
