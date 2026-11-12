const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const key = 'teamplay-v1';
const games = new Map($$('[data-game]').map(card => [card.dataset.game, $('h2', card).textContent]));
const profiles = ['Новичок', 'Любитель', 'Опытный'];
const examples = [
  { id: 'cs-team', game: 'cs2', title: 'North Side', author: 'Alex_Shadow', role: 'Снайпер', description: 'Ищем пятого игрока для Premier. Тренируемся по будням после 19:00.' },
  { id: 'dota-team', game: 'dota', title: 'Midnight Stack', author: 'LunaCore', role: 'Саппорт', description: 'Играем рейтинг пятёркой и разбираем матчи вместе.' },
  { id: 'valorant-team', game: 'valorant', title: 'Pixel Division', author: 'NeonFox', role: 'Контроллер', description: 'Нужен игрок для вечерних скримов. Обсуждаем карты перед тренировкой.' },
  { id: 'hack-team', game: 'ai-battle', title: 'CodeCrafters', author: 'CodeMira', role: 'ML-разработчик', description: 'Собираем прототип для хакатона. Уже есть дизайнер и фронтендер.' },
  { id: 'rpg-team', game: 'cyberpunk', title: 'Ночной кооператив', author: 'DungeonMaster_G', role: 'Игрок', description: 'Ищем компанию для прохождения кооперативных RPG на выходных.' },
  { id: 'jam-team', game: 'gamejam', title: 'Tiny Worlds', author: 'PixelFox', role: '2D-художник', description: 'Делаем короткую игру для джема. Нужны персонажи и окружение.' }
];
const exampleReviews = [
  { player: 'Alex_Shadow', author: 'NeonFox', game: 'cs2', rating: 5, description: 'Собрал команду вовремя и помог разобрать ошибки после игры.' },
  { player: 'CodeMira', author: 'PixelFox', game: 'ai-battle', rating: 5, description: 'Понятно объясняла решения и заранее предупредила о сложностях.' },
  { player: 'LunaCore', author: 'Alex_Shadow', game: 'dota', rating: 4, description: 'Хорошая коммуникация. На следующей тренировке стоит разобрать выбор героев.' }
];
const screens = $$('[data-screen]');
const profileForm = $('#profile-form');
const requestDialog = $('#request-dialog');
const reviewDialog = $('#review-dialog');
const search = $('.site-search');
const gameFilter = $('#request-game');
const queryFilter = $('#request-query');
const mineFilter = $('#request-mine');
const reviewGame = $('#review-game');
const reviewRating = $('#review-rating');
let state;
let category = 'all';

function emptyState() {
  return { profile: null, requests: [], replies: [], reviews: [] };
}

const validText = (value, max) => typeof value === 'string' && !!value.trim() && value.length <= max;
const normalize = (value) => value.toLocaleLowerCase('ru').replaceAll('ё', 'е');
const validProfile = (profile) => profile && validText(profile.nickname, 32) && games.has(profile.game)
  && validText(profile.role, 40) && profiles.includes(profile.level)
  && typeof profile.schedule === 'string' && profile.schedule.length <= 60;
const validRequest = (item) => item && games.has(item.game) && validText(item.title, 70)
  && validText(item.role, 40) && validText(item.description, 320);
const validReview = (item) => item && validText(item.player, 32) && validText(item.author, 32)
  && games.has(item.game) && Number.isInteger(item.rating) && item.rating >= 1 && item.rating <= 5
  && validText(item.description, 320);

function read() {
  const raw = localStorage.getItem(key);
  if (raw === null) return emptyState();
  const data = JSON.parse(raw);
  if (!data || !(data.profile === null || validProfile(data.profile))
    || !Array.isArray(data.requests) || !data.requests.every(item => validRequest(item)
      && typeof item.id === 'string' && /^local-[a-z0-9-]+$/.test(item.id)
      && validText(item.author, 32) && typeof item.closed === 'boolean')
    || !Array.isArray(data.replies) || !data.replies.every(id => examples.some(item => item.id === id))
    || !Array.isArray(data.reviews) || !data.reviews.every(validReview)) throw new Error('Некорректные данные');
  return data;
}

function feedback(message, target = $('.notice')) {
  target.textContent = message;
  target.hidden = !message;
}

function save(change, message, target) {
  try {
    const next = read();
    const error = change(next);
    if (error) {
      feedback(error, target);
      return false;
    }
    localStorage.setItem(key, JSON.stringify(next));
    state = next;
  } catch {
    feedback('Сохранение недоступно. Проверь настройки хранилища браузера.', target);
    return false;
  }
  feedback(message);
  return true;
}

function element(tag, value, className = '') {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = value;
  return node;
}

function action(label, handler, quiet = false) {
  const button = element('button', label, quiet ? 'button button--quiet' : 'button');
  button.type = 'button';
  button.addEventListener('click', handler);
  return button;
}

for (const select of $$('[data-game-select]')) {
  if (select.hasAttribute('data-all')) select.add(new Option('Все дисциплины', ''));
  for (const [id, title] of games) select.add(new Option(title, id));
}

function showProfile() {
  const profile = state.profile;
  const nickname = profile?.nickname || '';
  $('[data-avatar]').textContent = nickname ? [...nickname][0].toLocaleUpperCase('ru') : '?';
  if (!profile) return;
  for (const name of ['nickname', 'game', 'role', 'level', 'schedule']) profileForm.elements[name].value = profile[name];
}

function requireProfile() {
  if (state.profile) return true;
  feedback('Сначала заполни анкету игрока.');
  location.hash = 'profile';
  profileForm.elements.nickname.focus();
  return false;
}

function renderCatalog() {
  const query = normalize(search.elements.query.value.trim());
  let shown = 0;
  for (const card of $$('[data-game]')) {
    card.hidden = (category !== 'all' && card.dataset.type !== category) || !normalize(card.textContent).includes(query);
    if (!card.hidden) shown++;
  }
  $('[data-catalog-empty]').hidden = shown > 0;
  for (const button of $$('[data-category]')) button.setAttribute('aria-pressed', String(button.dataset.category === category));
}

function requestCard(item) {
  const mine = item.id.startsWith('local-');
  const replied = state.replies.includes(item.id);
  const card = element('article', '', 'card entry');
  const metadata = games.get(item.game) + ' · ' + item.author;
  const footer = element('div', '', 'actions');
  footer.append(element('p', item.closed ? 'Набор закрыт' : 'Ищем: ' + item.role, 'tag'));
  if (mine) {
    footer.append(action(item.closed ? 'Открыть набор' : 'Закрыть набор', () => {
      if (save(next => {
        const current = next.requests.find(row => row.id === item.id);
        if (!current) return 'Заявка не найдена.';
        current.closed = !item.closed;
      }, item.closed ? 'Набор открыт.' : 'Набор закрыт. Заявка доступна в «Мои заявки и отклики».')) renderRequests();
    }, true));
  } else {
    footer.append(action(replied ? 'Отменить отклик' : 'Откликнуться', () => {
      if (!requireProfile()) return;
      if (save(next => {
        if (!next.profile) return 'Сначала заполни анкету игрока.';
        const remaining = next.replies.filter(id => id !== item.id);
        next.replies = replied ? remaining : [...remaining, item.id];
      }, replied ? 'Отклик отменён.' : 'Отклик сохранён в этом браузере.')) renderRequests();
    }, replied));
  }
  card.append(element('p', metadata + (mine ? '' : ' · пример'), 'muted'), element('h2', item.title),
    element('p', item.description, 'entry__text'), footer);
  return card;
}

function renderRequests() {
  const query = normalize(queryFilter.value.trim());
  const items = [...state.requests.slice().reverse(), ...examples].filter(item => {
    const belongs = item.id.startsWith('local-') || state.replies.includes(item.id);
    return (mineFilter.checked ? belongs : !item.closed)
      && (!gameFilter.value || item.game === gameFilter.value)
      && normalize([item.title, item.role, item.author, games.get(item.game)].join(' ')).includes(query);
  });
  $('[data-request-count]').textContent = 'Заявок: ' + items.length;
  $('[data-requests]').replaceChildren(...(items.length ? items.map(requestCard)
    : [element('p', 'Заявок по этому запросу нет. Измени фильтры или создай заявку.', 'empty')]));
}

function renderReviews() {
  const all = [...state.reviews.slice().reverse(), ...exampleReviews];
  const positive = all.filter(item => item.rating >= 4).length;
  const average = all.reduce((sum, item) => sum + item.rating, 0) / all.length;
  $('[data-average]').textContent = average.toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' / 5';
  $('[data-review-count]').textContent = all.length;
  $('[data-positive]').textContent = Math.round(100 * positive / all.length) + '%';
  const items = all.filter(item => (!reviewGame.value || item.game === reviewGame.value)
    && (!reviewRating.value || item.rating === Number(reviewRating.value)));
  const cards = items.map(item => {
    const card = element('article', '', 'card entry');
    card.append(element('p', games.get(item.game) + ' · ' + item.author + (exampleReviews.includes(item) ? ' · пример' : ''), 'muted'),
      element('h2', item.player), element('p', item.rating + ' / 5', 'tag'), element('p', item.description, 'entry__text'));
    return card;
  });
  $('[data-reviews]').replaceChildren(...(cards.length ? cards : [element('p', 'Отзывы по этому фильтру не найдены.', 'empty')]));
}

function route(focus = false) {
  const [name, query] = location.hash.slice(1).split('?');
  const screen = screens.find(item => item.id === name) || screens[0];
  const params = new URLSearchParams(query);
  for (const item of screens) item.hidden = item !== screen;
  for (const link of $$('.nav a')) {
    if (link.hash === '#' + screen.id) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  if (screen.id === 'catalog') {
    category = 'all';
    search.elements.query.value = (params.get('q') || '').slice(0, 80);
    renderCatalog();
  } else if (screen.id === 'requests') {
    const game = params.get('game');
    gameFilter.value = games.has(game) ? game : '';
    mineFilter.checked = false;
    queryFilter.value = '';
    renderRequests();
  } else if (screen.id === 'reviews') renderReviews();
  else showProfile();
  if (focus) {
    window.scrollTo(0, 0);
    $('h1', screen).focus({ preventScroll: true });
  }
}

profileForm.addEventListener('submit', event => {
  event.preventDefault();
  const fields = new FormData(profileForm);
  const profile = Object.fromEntries([...fields].map(([name, value]) => [name, value.trim()]));
  const target = $('.form-status', profileForm);
  if (!validProfile(profile)) { feedback('Заполни ник, роль и дисциплину.', target); return; }
  if (save(next => { next.profile = profile; }, 'Профиль сохранён.', target)) {
    feedback('', target);
    showProfile();
  }
});

search.addEventListener('submit', event => {
  event.preventDefault();
  const query = search.elements.query.value.trim();
  if (!query) { feedback('Введи название игры или дисциплины.'); return; }
  const hash = '#catalog?' + new URLSearchParams({ q: query });
  if (location.hash === hash) route();
  else location.hash = hash;
});

for (const button of $$('[data-category]')) {
  button.addEventListener('click', () => {
    category = button.dataset.category;
    renderCatalog();
  });
}
for (const field of [gameFilter, mineFilter]) field.addEventListener('change', renderRequests);
queryFilter.addEventListener('input', renderRequests);
for (const field of [reviewGame, reviewRating]) field.addEventListener('change', renderReviews);

function openDialog(dialog, game) {
  if (!requireProfile()) return;
  const form = $('form', dialog);
  form.reset();
  form.elements.game.value = game || state.profile.game;
  feedback('', $('.form-status', dialog));
  dialog.showModal();
}
for (const button of $$('[data-create-request]')) button.addEventListener('click', () => {
  openDialog(requestDialog, !$('#requests').hidden ? gameFilter.value : '');
});
$('[data-create-review]').addEventListener('click', () => openDialog(reviewDialog, reviewGame.value));
for (const button of $$('[data-close]')) button.addEventListener('click', () => button.closest('dialog').close());

$('form', requestDialog).addEventListener('submit', event => {
  event.preventDefault();
  const fields = new FormData(event.currentTarget);
  const item = {
    game: fields.get('game'), title: fields.get('title').trim(),
    role: fields.get('role').trim(), description: fields.get('description').trim()
  };
  const target = $('.form-status', requestDialog);
  if (!validRequest(item)) { feedback('Заполни название, дисциплину, роль и описание.', target); return; }
  if (save(next => {
    if (!next.profile) return 'Сначала заполни анкету игрока.';
    const id = 'local-' + Date.now() + '-' + next.requests.length;
    next.requests.push({ ...item, id, author: next.profile.nickname, closed: false });
  }, 'Заявка сохранена в этом браузере.', target)) {
    requestDialog.close();
    const hash = '#requests?game=' + item.game;
    if (location.hash === hash) route();
    else location.hash = hash;
  }
});

$('form', reviewDialog).addEventListener('submit', event => {
  event.preventDefault();
  const fields = new FormData(event.currentTarget);
  const item = {
    player: fields.get('player').trim(), author: state.profile?.nickname, game: fields.get('game'),
    rating: Number(fields.get('rating')), description: fields.get('description').trim()
  };
  const target = $('.form-status', reviewDialog);
  if (!validReview(item)) { feedback('Введи ник, оценку и текст отзыва.', target); return; }
  if (save(next => {
    if (!next.profile) return 'Сначала заполни анкету игрока.';
    next.reviews.push({ ...item, author: next.profile.nickname });
  }, 'Отзыв сохранён в этом браузере.', target)) {
    reviewDialog.close();
    reviewGame.value = '';
    reviewRating.value = '';
    renderReviews();
  }
});

function load() {
  try { state = read(); }
  catch {
    state = emptyState();
    feedback('Сохранённые данные недоступны. Показаны примеры.');
  }
  route();
}
window.addEventListener('hashchange', () => route(true));
window.addEventListener('storage', event => {
  if (event.key === key || event.key === null) load();
});
load();
