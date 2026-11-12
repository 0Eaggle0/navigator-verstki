const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const storageKey = 'kinosphere-v2';
const valueOf = (root, selector) => $(selector, root)?.textContent.trim() || '';
const validText = (value, max) => typeof value === 'string' && !!value.trim() && value.length <= max;
const normalize = (value) => value.toLocaleLowerCase('ru').replaceAll('ё', 'е');

const films = new Map($$('[data-film]').map((card) => {
  const id = card.dataset.film;
  return [id, {
    id,
    title: valueOf(card, 'h1, h3, h4'),
    meta: valueOf(card, '.card__meta span') || valueOf(card, '.hero__tags'),
    description: valueOf(card, '.hero__text'),
    cast: valueOf(card, '.card__cast, .hero__cast'),
    poster: $('img.hero__bg, .card__poster img, img.room__avatar', card),
    moods: card.dataset.moods.split(' ')
  }];
}));
const collections = {
  potter: ['Гарри Поттер и философский камень', 'Гарри Поттер и Тайная комната', 'Гарри Поттер и узник Азкабана', 'Гарри Поттер и Кубок огня', 'Гарри Поттер и Орден Феникса', 'Гарри Поттер и Принц-полукровка', 'Гарри Поттер и Дары Смерти: Часть I', 'Гарри Поттер и Дары Смерти: Часть II'],
  lotr: ['Братство Кольца', 'Две крепости', 'Возвращение короля'],
  marvel: ['Мстители', 'Мстители: Эра Альтрона', 'Мстители: Война бесконечности', 'Мстители: Финал'],
  wick: ['Джон Уик', 'Джон Уик 2', 'Джон Уик 3', 'Джон Уик 4']
};
const demoRooms = [
  { id: 'interstellar', title: 'Интерстеллар', film: 'interstellar', members: ['Артём'] },
  { id: 'bladerunner', title: 'Бегущий по лезвию 2049', film: 'bladerunner', members: ['София'] }
];
const roomDialog = $('#create-room');
const reviewDialog = $('#create-review');
const detail = $('[data-detail]');
const body = $('.detail__body');
const title = $('#detail-title');
let state;

function initialState(saved = []) {
  return { saved, watched: [], rooms: structuredClone(demoRooms), profile: '', reviews: [] };
}

function readState() {
  const raw = localStorage.getItem(storageKey);
  if (raw === null) return initialState(localStorage.getItem('kinosphere-dune') === 'yes' ? ['dune'] : []);
  const data = JSON.parse(raw);
  if (!data || !['saved', 'watched', 'rooms', 'reviews'].every((key) => Array.isArray(data[key]))
    || !(data.profile === '' || validText(data.profile, 40))) throw new Error('Некорректный профиль');
  const ids = new Set();
  for (const room of data.rooms) {
    if (!room || typeof room.id !== 'string' || !/^[a-z0-9-]+$/.test(room.id) || ids.has(room.id)
      || !validText(room.title, 60) || !films.has(room.film) || !Array.isArray(room.members)
      || !room.members.length || room.members.length > 30 || room.members.some((member) => !validText(member, 40))) {
      throw new Error('Некорректная комната');
    }
    ids.add(room.id);
  }
  if (data.reviews.some((review) => !review || !films.has(review.film)
    || !validText(review.author, 40) || !validText(review.text, 400))) throw new Error('Некорректная рецензия');
  data.saved = [...new Set(data.saved.filter((id) => films.has(id)))];
  data.watched = [...new Set(data.watched.filter((id) => films.has(id)))];
  return data;
}

function status(message, element = $('.catalog-status')) {
  element.hidden = !message;
  element.textContent = message;
}

function save(change, message, feedback) {
  try {
    const next = readState();
    const error = change(next);
    if (error) { status(error, feedback); return false; }
    localStorage.setItem(storageKey, JSON.stringify(next));
    state = next;
  } catch {
    status('Не удалось сохранить данные. Проверь доступ к хранилищу браузера.', feedback);
    return false;
  }
  syncHome();
  status(message);
  return true;
}

function element(tag, content, className = '') {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = content;
  return node;
}

function link(text, href, className = 'link') {
  const node = element('a', text, className);
  node.href = href;
  return node;
}

function button(text, className = 'button button--ghost') {
  const node = element('button', text, className);
  node.type = 'button';
  return node;
}

function syncBookmarks() {
  $('.my-list-count').textContent = state.saved.length;
  for (const control of $$('[data-save], [data-watch]')) {
    const id = control.dataset.save || control.dataset.watch;
    const active = (control.hasAttribute('data-save') ? state.saved : state.watched).includes(id);
    control.setAttribute('aria-pressed', String(active));
  }
}

const reviewsGrid = $('.reviews__grid');
const exampleReviews = [...reviewsGrid.children];
function syncHome() {
  const cards = state.rooms.filter((room) => !demoRooms.some((demo) => demo.id === room.id)).map((room) => {
    const card = element('article', '', 'room');
    card.append(element('h4', room.title), element('p', films.get(room.film).title + ' · Ведущий: ' + room.members[0], 'room__note'),
      link('Открыть', '#room-' + room.id, 'button button--teal button--small'));
    return card;
  });
  $('[data-local-rooms]').replaceChildren(...cards);
  $('#room-members').replaceChildren(...state.rooms.map((room) => {
    const row = element('li', '', 'room');
    row.append(link(room.title, '#room-' + room.id), element('p', room.members.join(', '), 'room__note'));
    return row;
  }));
  const notes = state.reviews.slice().reverse().map((review) => {
    const note = element('article', '', 'review');
    note.append(element('p', films.get(review.film).title, 'chip chip--small'), element('p', review.text, 'review__text'),
      element('p', review.author, 'room__note'));
    return note;
  });
  reviewsGrid.replaceChildren(...notes, ...exampleReviews);
  syncBookmarks();
}

function show(titleText, back = '#home', backLabel = 'На главную') {
  $('[data-home]').hidden = true;
  detail.hidden = false;
  title.textContent = titleText;
  $('[data-back]').href = back;
  $('[data-back]').textContent = '← ' + backLabel;
  body.replaceChildren();
}

function showList(titleText, items, empty) {
  show(titleText, '#new', 'В каталог');
  if (!items.length) {
    body.append(element('p', empty));
    return;
  }
  const list = element('ul', '', 'result-list');
  for (const film of items) {
    const row = element('li', '', 'room');
    row.append(link(film.title, '#film-' + film.id));
    if (film.meta) row.append(element('p', film.meta, 'room__note'));
    list.append(row);
  }
  body.append(list);
}

function showFilm(film) {
  show(film.title, '#new', 'В каталог');
  const row = element('div', '', 'film-detail');
  const poster = film.poster.cloneNode();
  poster.className = '';
  poster.alt = '';
  const info = element('div', '', 'detail__body');
  for (const line of [film.meta, film.description, film.cast]) {
    if (line) info.append(element('p', line));
  }
  const controls = element('div', '', 'detail__actions');
  const saveFilm = button('В мой список');
  saveFilm.dataset.save = film.id;
  const watched = button('Отметить просмотренным');
  watched.dataset.watch = film.id;
  const createRoom = button('Создать комнату');
  createRoom.dataset.openRoom = film.id;
  const trailer = link('Найти трейлер на YouTube', 'https://www.youtube.com/results?search_query=' + encodeURIComponent(film.title + ' официальный трейлер'));
  trailer.target = '_blank';
  trailer.rel = 'noopener noreferrer';
  controls.append(saveFilm, watched, createRoom);
  info.append(controls, trailer);
  row.append(poster, info);
  body.append(row);
  syncBookmarks();
}

function nameForm(label, action, initial, submit) {
  const form = element('form', '', 'modal__form detail-form');
  const field = element('label', label);
  const input = document.createElement('input');
  input.required = true;
  input.maxLength = 40;
  input.value = initial;
  field.append(input);
  const submitButton = element('button', action, 'button button--teal');
  const error = element('p', '', 'modal__error');
  error.setAttribute('role', 'alert');
  error.hidden = true;
  form.append(field, submitButton, error);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = input.value.trim();
    if (!validText(name, 40)) { status('Введи имя длиной до 40 символов.', error); return; }
    submit(name, error, input);
  });
  return form;
}

function showRoom(room) {
  show(room.title, '#rooms', 'К комнатам');
  const list = element('ul', '', 'result-list');
  function showMembers(members) {
    list.replaceChildren(...members.map((member, index) => element('li', index === 0 ? member + ' · ведущий' : member, 'room')));
  }
  showMembers(room.members);
  body.append(
    link(films.get(room.film).title, '#film-' + room.film),
    element('p', 'Комната доступна в этом браузере. Список зрителей заполняется вручную.'),
    element('h2', 'Зрители'),
    list,
    nameForm('Имя зрителя', 'Добавить зрителя', state.profile, (name, error, input) => {
      if (save((next) => {
        const current = next.rooms.find((item) => item.id === room.id);
        if (!current || current.members.length >= 30) return 'В комнате может быть до 30 зрителей.';
        if (current.members.some((member) => normalize(member) === normalize(name))) return 'Это имя уже есть в комнате.';
        current.members.push(name);
      }, 'Зритель добавлен.', error)) {
        showMembers(state.rooms.find((item) => item.id === room.id).members);
        status('', error);
        input.value = '';
      }
    })
  );
}

function showProfile() {
  show('Профиль');
  body.append(nameForm('Твоё имя', 'Сохранить имя', state.profile, (name, error) => {
    if (save((next) => { next.profile = name; }, 'Имя сохранено.', error)) status('', error);
  }), link('Мой список', '#saved'), link('История просмотра', '#history'));
}

function renderRoute(focus = false) {
  const [route, query] = location.hash.slice(1).split('?');
  const params = new URLSearchParams(query);
  const film = route.startsWith('film-') && films.get(route.slice(5));
  const room = route.startsWith('room-') && state.rooms.find((item) => item.id === route.slice(5));
  const collection = route.startsWith('collection-') && route.slice(11);
  if (film) showFilm(film);
  else if (room) showRoom(room);
  else if (collection && Object.hasOwn(collections, collection)) {
    const card = $('[data-collection="' + collection + '"]');
    show(valueOf(card, 'h3'), '#collections', 'К коллекциям');
    const list = element('ol', '', 'result-list');
    list.append(...collections[collection].map((name) => element('li', name)));
    body.append(list);
  } else if (route === 'profile') showProfile();
  else if (route === 'saved') showList('Мой список', state.saved.map((id) => films.get(id)), 'Список пока пуст. Добавь фильм из каталога.');
  else if (route === 'history') showList('История просмотра', state.watched.map((id) => films.get(id)), 'Отмечай просмотренные фильмы в каталоге.');
  else if (route === 'search') {
    const term = (params.get('q') || '').trim().slice(0, 80);
    const matches = term ? [...films.values()].filter((item) => normalize([item.title, item.meta, item.cast].join(' ')).includes(normalize(term))) : [];
    showList(term ? 'Поиск · ' + term : 'Поиск', matches, 'Ничего не найдено. Попробуй другое название, жанр или имя актёра.');
  } else if (route === 'recommend') {
    const moods = params.getAll('mood');
    showList('Подборка Бэтти', [...films.values()].filter((item) => item.moods.some((mood) => moods.includes(mood))), 'Выбери настроение на главной.');
  } else if (/^(film|room|collection)-/.test(route)) {
    show('Страница не найдена');
    body.append(element('p', 'В этом браузере нет такой комнаты, коллекции или фильма.'));
  } else {
    $('[data-home]').hidden = false;
    detail.hidden = true;
    if (['new', 'rooms', 'collections', 'reviews'].includes(route)) document.getElementById(route).scrollIntoView();
    else if (route === 'home') window.scrollTo(0, 0);
  }
  for (const anchor of $$('.menu a')) {
    const current = anchor.hash === '#' + (route || 'home');
    anchor.classList.toggle('menu__active', current);
    if (current) anchor.setAttribute('aria-current', 'page');
    else anchor.removeAttribute('aria-current');
  }
  if (!detail.hidden && focus) {
    window.scrollTo(0, 0);
    title.focus({ preventScroll: true });
  }
}

function openForm(dialog, film) {
  const form = $('form', dialog);
  form.reset();
  const fields = form.elements;
  fields.film.replaceChildren(...[...films.values()].map((item) => new Option(item.title, item.id)));
  if (film) fields.film.value = film;
  if (dialog === roomDialog) fields.name.value = state.profile;
  status('', $('.modal__error', dialog));
  dialog.showModal();
}

document.addEventListener('click', (event) => {
  const control = event.target.closest('button[data-open-room], button[data-open-review], button[data-close], button[data-save], button[data-watch]');
  if (!control) return;
  if (control.hasAttribute('data-close')) control.closest('dialog').close();
  else if (control.hasAttribute('data-open-room')) openForm(roomDialog, control.dataset.openRoom);
  else if (control.hasAttribute('data-open-review')) openForm(reviewDialog);
  else {
    const key = control.hasAttribute('data-save') ? 'saved' : 'watched';
    const id = control.dataset.save || control.dataset.watch;
    save((next) => {
      next[key] = next[key].includes(id) ? next[key].filter((item) => item !== id) : [id, ...next[key]];
    }, 'Отметка обновлена.');
  }
});

$('form', roomDialog).addEventListener('submit', (event) => {
  event.preventDefault();
  const fields = event.currentTarget.elements;
  const room = { title: fields.room.value.trim(), film: fields.film.value, members: [fields.name.value.trim()] };
  const error = $('.modal__error', roomDialog);
  if (!validText(room.title, 60) || !validText(room.members[0], 40) || !films.has(room.film)) {
    status('Введи название комнаты и своё имя, затем выбери фильм.', error);
    return;
  }
  if (save((next) => {
    room.id = 'local-' + Date.now() + '-' + next.rooms.length;
    next.rooms.push(room);
  }, 'Комната сохранена в этом браузере.', error)) {
    roomDialog.close();
    location.hash = 'room-' + room.id;
  }
});

$('form', reviewDialog).addEventListener('submit', (event) => {
  event.preventDefault();
  const fields = event.currentTarget.elements;
  const review = { film: fields.film.value, text: fields.review.value.trim(), author: state.profile || 'Ты' };
  const error = $('.modal__error', reviewDialog);
  if (!films.has(review.film) || !validText(review.text, 400)) {
    status('Выбери фильм и напиши до 400 символов.', error);
    return;
  }
  if (save((next) => { next.reviews.push(review); }, 'Рецензия сохранена в этом браузере.', error)) reviewDialog.close();
});

$('.search').addEventListener('submit', (event) => {
  event.preventDefault();
  const query = event.currentTarget.elements.query.value.trim();
  if (query) location.hash = 'search?' + new URLSearchParams({ q: query });
});

for (const mood of $$('[data-mood]')) {
  mood.addEventListener('click', () => {
    const active = mood.classList.toggle('is-active');
    mood.setAttribute('aria-pressed', String(active));
    status('', $('.mood-hint'));
  });
}
$('[data-recommend]').addEventListener('click', () => {
  const selected = $$('[data-mood][aria-pressed=true]');
  if (!selected.length) { status('Сначала выбери настроение.', $('.mood-hint')); return; }
  const params = new URLSearchParams(selected.map((item) => ['mood', item.dataset.mood]));
  location.hash = 'recommend?' + params;
});

const tabs = $$('[data-room-tab]');
for (const tab of tabs) {
  tab.addEventListener('click', () => {
    for (const control of tabs) {
      const active = control === tab;
      control.classList.toggle('tab--active', active);
      control.setAttribute('aria-pressed', String(active));
      document.getElementById(control.dataset.roomTab).hidden = !active;
    }
  });
}

const burger = $('.burger');
const menu = $('.menu');
function setMenu(open) {
  menu.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
}
burger.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
menu.addEventListener('click', (event) => {
  if (event.target.closest('a')) setMenu(false);
});

function load() {
  try { state = readState(); }
  catch {
    state = initialState();
    status('Сохранённые данные недоступны. Показан учебный каталог.');
  }
  syncHome();
  renderRoute();
}
window.addEventListener('hashchange', () => renderRoute(true));
window.addEventListener('storage', (event) => {
  if (event.key === storageKey || event.key === null) load();
});
load();
