function validText(value, max = 160) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}
function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T12:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function cleanGoing(value, ids) {
  return Array.isArray(value) ? [...new Set(value.filter(id => ids.includes(id)))] : [];
}
function cleanSuggestions(value) {
  return Array.isArray(value) ? value.filter(item => item && validText(item.title) && validText(item.place) && validDate(item.date)).slice(0, 100) : [];
}
// UI
const events = [...document.querySelectorAll('.event')];
const eventIds = events.map(event => event.dataset.id);
const filters = document.querySelectorAll('.filter');
const panel = document.querySelector('#screen');
const search = document.querySelector('#event-search');
const toast = document.querySelector('.toast');
let toastTimer;
let activeFilter = 'free';
let route = '';
function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 5000);
}
function read(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { showToast('Браузер не разрешил сохранить данные. Освободи место или разреши хранение.'); return false; }
}
let going = cleanGoing(read('omsk-going'), eventIds);
let suggestions = cleanSuggestions(read('omsk-suggestions'));
function readProfile() {
  const profile = read('omsk-profile');
  return profile && validText(profile.name, 60) ? { name: profile.name, active: profile.active !== false } : null;
}
let profile = readProfile();
function setProfile(next) {
  if (!save('omsk-profile', next)) return false;
  profile = next;
  return true;
}
const normalize = (value) => value.toLocaleLowerCase('ru').replaceAll('ё', 'е');
function matches(event, filter) {
  if (filter === 'all') return true;
  if (filter === 'free') return event.dataset.price === '0';
  if (filter === 'near') return event.dataset.near === 'yes';
  return event.dataset.cat === filter;
}
function applyFilter() {
  let shown = 0;
  const query = normalize(search.value.trim());
  events.forEach(event => {
    const inRoute = route === 'going' ? going.includes(event.dataset.id) : route === 'near' ? matches(event, 'near') : true;
    const searchable = [...event.querySelectorAll('h3, .event__meta .muted')].map(node => node.textContent).join(' ');
    event.hidden = !inRoute || !matches(event, activeFilter) || !normalize(searchable).includes(query);
    if (!event.hidden) shown++;
  });
  document.querySelector('.found__count').textContent = shown;
  const empty = document.querySelector('.empty');
  empty.textContent = route === 'going' && !going.length ? 'Список пуст. Отметь события в афише кнопкой «Иду».' : 'Ничего не найдено. Измени поиск или фильтр.';
  empty.hidden = shown > 0;
  filters.forEach(button => {
    button.classList.toggle('filter--active', button.dataset.filter === activeFilter);
    button.setAttribute('aria-pressed', button.dataset.filter === activeFilter);
  });
}
function showGoing() {
  events.forEach(event => event.querySelector('.going').setAttribute('aria-pressed', going.includes(event.dataset.id)));
  const count = document.querySelector('.going-count');
  count.textContent = going.length;
  count.hidden = going.length === 0;
}
function toggleGoing(id) {
  const current = cleanGoing(read('omsk-going'), eventIds);
  const next = current.includes(id) ? current.filter(value => value !== id) : [...current, id];
  if (!save('omsk-going', next)) return false;
  going = next;
  showGoing();
  applyFilter();
  return true;
}
filters.forEach(button => button.addEventListener('click', () => { activeFilter = button.dataset.filter; applyFilter(); }));
search.addEventListener('input', applyFilter);
document.querySelector('.round-button').addEventListener('click', () => { location.hash = 'search'; search.focus(); });
function eventInfo(event) {
  return [event.querySelector('h3').textContent, event.querySelector('.date').textContent,
    event.querySelector('.event__meta').textContent, event.querySelector('.price').textContent]
    .map(value => value.replace(/\s+/g, ' ').trim()).join(' · ');
}
events.forEach(event => {
  const heading = event.querySelector('h3');
  const link = document.createElement('a');
  link.href = '#event/' + event.dataset.id; link.textContent = heading.textContent; heading.replaceChildren(link);
  event.querySelector('.going').addEventListener('click', () => toggleGoing(event.dataset.id));
  event.querySelector('.share').addEventListener('click', async () => {
    // Адреса blob: и file: недоступны получателю. Из превью и ZIP отправляем карточку текстом.
    let text = eventInfo(event) + ' · учебный пример';
    if (location.protocol === 'https:' || location.protocol === 'http:') {
      const url = new URL(location.href);
      url.hash = 'event/' + event.dataset.id;
      text += '\n' + url.href;
    }
    try { await navigator.clipboard.writeText(text); showToast('Карточка события скопирована'); }
    catch {
      const dialog = document.querySelector('#share-dialog');
      const field = dialog.querySelector('textarea');
      field.value = text;
      dialog.showModal();
      field.select();
    }
  });
});
function addText(tag, text, target = panel) {
  const node = document.createElement(tag); node.textContent = text; target.append(node); return node;
}
function addLink(text, hash) {
  const link = addText('a', text); link.href = '#' + hash; link.className = 'button'; return link;
}
function renderSuggestions() {
  addText('h2', 'Мои предложения');
  if (!suggestions.length) addText('p', 'Пока нет предложений. Добавь событие кнопкой под афишей.');
  suggestions.forEach(item => {
    const card = addText('article', ''); card.className = 'digest';
    addText('h3', item.title, card); addText('p', item.date + ' · ' + item.place, card);
    addText('p', 'Локальный черновик', card);
  });
}
function renderRoute(focus = false) {
  const [name, query] = location.hash.slice(1).split('?');
  route = name;
  const list = ['', 'afisha', 'near', 'going', 'search'].includes(route);
  document.querySelectorAll('[data-list]').forEach(node => { node.hidden = !list; });
  document.querySelector('#weekend-digest').hidden = !['', 'afisha', 'collections'].includes(route);
  panel.hidden = list;
  panel.replaceChildren();
  const titles = { near: 'Рядом с центром', going: 'Я иду', search: 'Поиск событий', collections: 'Подборки', profile: 'Мой профиль', login: 'Вход', register: 'Создать профиль', guide: 'Гид по центру' };
  const heading = document.querySelector('h1');
  heading.textContent = Object.hasOwn(titles, route) ? titles[route] : route.startsWith('event/') ? 'О событии' : 'Куда сходить';
  document.querySelectorAll('.nav__link').forEach(link => {
    const selected = link.hash === '#' + (route || 'afisha');
    link.classList.toggle('nav__link--active', selected);
    if (selected) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  if (list) {
    if (focus || !route) {
      const selected = new URLSearchParams(query).get('filter');
      activeFilter = [...filters].some(button => button.dataset.filter === selected)
        ? selected : ['', 'afisha'].includes(route) ? 'free' : 'all';
      if (route !== 'search') search.value = '';
    }
    applyFilter();
  } else if (route === 'collections') {
    addText('p', 'Выбери настроение для прогулки. Все события — учебные примеры.');
    addLink('Бесплатные события', 'afisha?filter=free');
    addLink('Прогулки по городу', 'afisha?filter=walk');
    addLink('Маршрут по центру', 'guide');
  } else if (route === 'guide') {
    addText('p', 'Пример пешего маршрута · около 1,5 часа · без билетов. Проверь доступность мест перед выходом.');
    const steps = addText('ol', '');
    ['Начни у памятника Любе на Любинском проспекте.', 'Пройди по улице Ленина и рассмотри фасады старых домов.', 'Заверши прогулку на набережной Тухачевского.'].forEach(text => addText('li', text, steps));
    addLink('Открыть прогулку в афише', 'event/lubinsky');
  } else if (route === 'profile') {
    addText('h2', profile?.active ? 'Привет, ' + profile.name : 'Ты пока не вошёл');
    addText('p', 'Локальный демопрофиль без пароля. Данные доступны всем, кто пользуется этим браузером.');
    if (profile?.active) {
      const logout = addText('button', 'Выйти'); logout.className = 'button';
      logout.addEventListener('click', () => {
        if (setProfile({ ...profile, active: false })) renderRoute(true);
      });
    } else { addLink('Войти', 'login'); addLink('Создать профиль', 'register'); }
    addLink('Мои события', 'going'); renderSuggestions();
  } else if (route === 'login' || route === 'register') {
    addText('p', 'Учебный режим: профиль хранится на этом устройстве. Пароль и настоящие контакты не нужны.');
    if (route === 'login') {
      if (profile) {
        const login = addText('button', 'Продолжить как ' + profile.name); login.className = 'button button--accent';
        login.addEventListener('click', () => {
          if (setProfile({ ...profile, active: true })) location.hash = 'profile';
        });
      } else addText('p', 'В этом браузере ещё нет профиля.');
      addLink('Создать локальный профиль', 'register');
    } else {
      const form = document.createElement('form'); form.className = 'local-form';
      form.innerHTML = '<label>Имя или псевдоним <input name="name" required maxlength="60" autocomplete="nickname"></label><button class="button button--accent">Сохранить профиль</button>';
      panel.append(form);
      form.addEventListener('submit', event => {
        event.preventDefault(); const name = form.elements.name.value.trim();
        if (!validText(name, 60)) { showToast('Введи имя или псевдоним'); return; }
        if (setProfile({ name, active: true })) location.hash = 'profile';
      });
    }
  } else if (route.startsWith('event/')) {
    const event = events.find(item => item.dataset.id === route.slice(6));
    if (event) {
      addText('h2', event.querySelector('h3').textContent);
      addText('p', event.querySelector('.date').textContent + ' · ' + event.querySelector('.event__meta').textContent.replace(/\s+/g, ' '));
      addText('p', 'Стоимость: ' + event.querySelector('.price').textContent);
      addText('p', 'Демонстрационное событие. Даты, цены и наличие мест не являются актуальной афишей. Отметка «Иду» сохраняет план, но не бронирует билет.');
      const button = addText('button', '', panel);
      button.className = 'button button--accent';
      const updateButton = () => {
        const marked = going.includes(event.dataset.id);
        button.textContent = marked ? 'Убрать из «Иду»' : 'Иду';
        button.setAttribute('aria-pressed', String(marked));
      };
      updateButton();
      button.addEventListener('click', () => { if (toggleGoing(event.dataset.id)) updateButton(); });
    } else addText('p', 'Такое событие не найдено.');
    addLink('Вернуться к афише', 'afisha');
  } else { addText('p', 'Раздел не найден.'); addLink('На афишу', 'afisha'); }
  if (focus) {
    window.scrollTo(0, 0);
    if (route === 'search') search.focus();
    else heading.focus({ preventScroll: true });
  }
}
const modal = document.querySelector('.modal');
const form = document.querySelector('.modal__form');
const error = document.querySelector('.modal__error');
document.querySelector('[data-open-suggest]').addEventListener('click', () => { error.hidden = true; modal.showModal(); });
document.querySelector('[data-close]').addEventListener('click', () => modal.close());
form.addEventListener('submit', event => {
  event.preventDefault();
  const item = { title: form.elements.title.value.trim(), date: form.elements.date.value, place: form.elements.place.value.trim() };
  const today = new Date();
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  if (!validText(item.title) || !validText(item.place) || !validDate(item.date) || item.date < localDate) {
    error.textContent = 'Заполни название и место (до 160 символов), выбери сегодняшнюю или будущую дату.';
    error.hidden = false; return;
  }
  const current = cleanSuggestions(read('omsk-suggestions'));
  if (current.length >= 100) { error.textContent = 'Достигнут лимит: 100 локальных предложений.'; error.hidden = false; return; }
  const next = [...current, item];
  if (!save('omsk-suggestions', next)) { error.textContent = 'Не удалось сохранить. Данные остались в форме.'; error.hidden = false; return; }
  suggestions = next;
  error.hidden = true;
  form.reset();
  modal.close();
  location.hash = 'profile';
  showToast('Черновик сохранён в профиле на этом устройстве. Он не отправлен.');
});
window.addEventListener('hashchange', () => renderRoute(true));
window.addEventListener('storage', event => {
  if (event.key !== null && !['omsk-going', 'omsk-profile', 'omsk-suggestions'].includes(event.key)) return;
  going = cleanGoing(read('omsk-going'), eventIds);
  suggestions = cleanSuggestions(read('omsk-suggestions'));
  profile = readProfile();
  showGoing();
  renderRoute();
});
showGoing();
renderRoute(Boolean(location.hash));
