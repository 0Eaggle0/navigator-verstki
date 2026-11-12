const me = 'Вы';
const storageKey = 'split-v2';
const demoGroups = [
  { id: 'altai', title: 'Поездка на Алтай', members: [me, 'Максим', 'Даша', 'Катя', 'Артём', 'Лена'] },
  { id: 'bar', title: 'Бар в пятницу', members: [me, 'Лена', 'Даша', 'Максим'] },
  { id: 'cottage', title: 'Коттедж на майские', members: [me, 'Лена', 'Даша', 'Максим', 'Артём', 'Катя', 'Миша', 'Оля'] }
];
const demoExpenses = [
  { title: 'Билеты до Алтая', cents: 408000, group: 'altai', payer: me },
  { title: 'Чек в баре', cents: 340000, group: 'bar', payer: 'Лена' }
];
const demoCollections = [
  { id: 'gift', title: 'Подарок Саше на день рождения', goal: 2500000, raised: 1800000 },
  { id: 'travel', title: 'Фонд поездки на Алтай', goal: 1500000, raised: 1500000 }
];

const currency = new Intl.NumberFormat('ru-RU', {
  style: 'currency', currency: 'RUB', minimumFractionDigits: 0, maximumFractionDigits: 2
});
const money = (cents) => currency.format(cents / 100);
const signed = (cents) => (cents > 0 ? '+' : '') + money(cents);
const maxCents = 999999999;
const validCents = (cents) => Number.isInteger(cents) && cents > 0 && cents <= maxCents;
const validText = (value, limit) => typeof value === 'string' && value.trim().length > 0 && value.length <= limit;

function parseMoney(value) {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(normalized)) return 0;
  const [rubles, kopecks = ''] = normalized.split('.');
  return Number(rubles) * 100 + Number(kopecks.padEnd(2, '0'));
}

function divide(cents, people) {
  return { share: Math.floor(cents / people), remainder: cents % people };
}

function membersFrom(value) {
  const names = value.split(',').map((name) => name.trim()).filter(Boolean);
  const unique = new Set([me.toLocaleLowerCase('ru')]);
  return [me, ...names.filter((name) => {
    const lower = name.toLocaleLowerCase('ru');
    if (unique.has(lower)) return false;
    unique.add(lower);
    return true;
  })];
}

function readState() {
  const raw = localStorage.getItem(storageKey);
  if (raw === null) {
    let previous = [];
    try {
      const value = JSON.parse(localStorage.getItem('split-expenses') || '[]');
      if (Array.isArray(value)) previous = value;
    } catch { /* Старые записи остаются в исходном ключе. */ }
    const legacy = previous.filter((entry) => typeof entry?.title === 'string' && entry.title.trim() && Number.isFinite(entry.sum) && validCents(Math.round(entry.sum * 100)))
      .map(({ title, sum }) => ({ title, cents: Math.round(sum * 100), group: '', payer: me }));
    return { groups: structuredClone(demoGroups), expenses: [...demoExpenses, ...legacy], payments: [], collections: structuredClone(demoCollections) };
  }

  const data = JSON.parse(raw);
  if (!data || !['groups', 'expenses', 'payments', 'collections'].every((key) => Array.isArray(data[key]))) {
    throw new Error('Не удалось прочитать сохранённые данные.');
  }
  const groups = new Map();
  for (const group of data.groups) {
    if (!group || typeof group.id !== 'string' || !/^[a-z0-9-]+$/.test(group.id) || groups.has(group.id)
      || !validText(group.title, 80) || !Array.isArray(group.members) || group.members[0] !== me
      || group.members.length < 2 || group.members.length > 20 || new Set(group.members).size !== group.members.length
      || group.members.some((name) => !validText(name, 40))) throw new Error('Некорректная группа.');
    groups.set(group.id, group);
  }
  for (const expense of data.expenses) {
    if (!expense || typeof expense.title !== 'string' || !validCents(expense.cents)
      || !(expense.group === '' ? expense.payer === me : groups.get(expense.group)?.members.includes(expense.payer))) {
      throw new Error('Некорректный расход.');
    }
  }
  for (const payment of data.payments) {
    const members = groups.get(payment?.group)?.members;
    if (!members?.includes(payment.from) || !members.includes(payment.to) || payment.from === payment.to
      || !Number.isSafeInteger(payment.cents) || payment.cents <= 0) throw new Error('Некорректный перевод.');
  }
  if (data.collections.some((item) => !item || typeof item.id !== 'string' || !validText(item.title, 80)
    || !validCents(item.goal) || !Number.isInteger(item.raised) || item.raised < 0 || item.raised > item.goal)) {
    throw new Error('Некорректный сбор.');
  }
  return data;
}

function balances(group, expenses, payments) {
  const totals = new Map(group.members.map((member) => [member, 0]));
  for (const expense of expenses) {
    const { share, remainder } = divide(expense.cents, group.members.length);
    for (const [index, member] of group.members.entries()) {
      totals.set(member, totals.get(member) - share - Number(index < remainder));
    }
    totals.set(expense.payer, totals.get(expense.payer) + expense.cents);
  }
  for (const payment of payments) {
    totals.set(payment.from, totals.get(payment.from) + payment.cents);
    totals.set(payment.to, totals.get(payment.to) - payment.cents);
  }
  return totals;
}

function transfersFor(totals) {
  const creditors = [...totals].filter(([, cents]) => cents > 0);
  const debtors = [...totals].filter(([, cents]) => cents < 0);
  const transfers = [];
  let creditor = 0;
  let debtor = 0;
  while (creditor < creditors.length && debtor < debtors.length) {
    const credit = creditors[creditor];
    const debt = debtors[debtor];
    const cents = Math.min(credit[1], -debt[1]);
    transfers.push({ from: debt[0], to: credit[0], cents });
    credit[1] -= cents;
    debt[1] += cents;
    if (credit[1] === 0) creditor++;
    if (debt[1] === 0) debtor++;
  }
  return transfers;
}

function groupSummary(data, group) {
  const expenses = data.expenses.filter((expense) => expense.group === group.id);
  const payments = data.payments.filter((payment) => payment.group === group.id);
  const totals = balances(group, expenses, payments);
  return { expenses, total: expenses.reduce((sum, item) => sum + item.cents, 0), balance: totals.get(me), transfers: transfersFor(totals) };
}

const $ = (selector, root = document) => root.querySelector(selector);
const expenseForm = $('#expense form');
const expenseFields = expenseForm.elements;
let state;
let detailGroup;
let activeCollection;
let pendingPayment;

function showStatus(message) {
  const status = $('.action-status');
  status.hidden = false;
  status.textContent = message;
}

function errorIn(form, message) {
  const error = $('.modal__error', form);
  error.textContent = message;
  error.hidden = !message;
}

function save(form, change, message) {
  try {
    const next = readState();
    const error = change(next);
    if (error) return errorIn(form, error);
    localStorage.setItem(storageKey, JSON.stringify(next));
    state = next;
  } catch {
    errorIn(form, 'Не удалось сохранить данные. Проверьте, что браузер разрешает локальное хранение.');
    return;
  }
  form.closest('dialog').close();
  render();
  showStatus(message);
}

function text(tag, content, className = '') {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = content;
  return element;
}

function button(label) {
  const element = text('button', label, 'chip-button');
  element.type = 'button';
  return element;
}

function expenseRow(expense, groupTitle) {
  const row = document.createElement('li');
  const description = text('p', '');
  const payer = expense.payer === me ? 'Вы оплатили' : 'Оплатил(а) ' + expense.payer;
  description.append(text('b', expense.title), text('span', groupTitle + ' · ' + payer, 'small'));
  row.append(description, text('p', money(expense.cents), 'feed__sum'));
  return row;
}

function paymentRow(payment, groupTitle) {
  const row = document.createElement('li');
  const description = text('p', '');
  description.append(text('b', payment.from + ' → ' + payment.to), text('span', groupTitle + ' · Перевод отмечен', 'small'));
  row.append(description, text('p', money(payment.cents), 'feed__sum'));
  return row;
}

function groupCard(group, summary) {
  let card = document.querySelector('[data-group-card="' + group.id + '"]');
  if (!card) {
    card = document.createElement('article');
    card.className = 'group';
    const open = button(group.title);
    open.className = 'group-link';
    open.dataset.group = group.id;
    const title = text('h3', '');
    title.append(open);
    const info = text('div', '', 'group__info');
    const total = text('p', '');
    total.dataset.groupTotal = '';
    info.append(title, total);
    const balance = text('div', '', 'group__balance');
    const amount = text('p', '', 'group__sum');
    amount.dataset.groupBalance = '';
    balance.append(text('p', 'Ваш баланс', 'label'), amount);
    card.append(info, balance);
    $('[data-custom-groups]').append(card);
  }
  $('[data-group-total]', card).textContent = 'Участников: ' + group.members.length + ' · Общие траты: ' + money(summary.total);
  const amount = $('[data-group-balance]', card);
  amount.textContent = signed(summary.balance);
  amount.classList.toggle('accent', summary.balance > 0);
}

function collectionCard(collection) {
  const card = text('article', '', 'card');
  const progress = document.createElement('progress');
  progress.max = collection.goal;
  progress.value = collection.raised;
  progress.setAttribute('aria-label', 'Прогресс сбора «' + collection.title + '»');
  card.append(text('h3', collection.title), text('p', 'Собрано ' + money(collection.raised) + ' из ' + money(collection.goal)), progress);
  if (collection.raised === collection.goal) {
    card.append(text('p', 'Цель достигнута', 'small'));
  } else {
    const add = button('Отметить взнос');
    add.addEventListener('click', () => {
      activeCollection = collection.id;
      $('[data-contribution-note]').textContent = collection.title + ' · Осталось ' + money(collection.goal - collection.raised);
      openDialog('contribution');
    });
    card.append(add);
  }
  return card;
}

function render() {
  $('[data-custom-groups]').replaceChildren();
  const settlements = $('[data-settlements]');
  settlements.replaceChildren();
  let receivable = 0;
  let payable = 0;
  let incoming = 0;
  let outgoing = 0;
  for (const group of state.groups) {
    const summary = groupSummary(state, group);
    groupCard(group, summary);
    for (const transfer of summary.transfers) {
      if (transfer.to === me) { receivable += transfer.cents; incoming++; }
      if (transfer.from === me) { payable += transfer.cents; outgoing++; }
      const card = text('article', '', 'card');
      const mark = button('Отметить перевод');
      mark.addEventListener('click', () => {
        pendingPayment = { ...transfer, group: group.id };
        $('[data-payment-note]').textContent = group.title + ' · ' + transfer.from + ' → ' + transfer.to + ' · ' + money(transfer.cents);
        openDialog('payment');
      });
      card.append(text('p', group.title, 'small'), text('h3', transfer.from + ' → ' + transfer.to), text('p', money(transfer.cents), 'group__sum'), mark);
      settlements.append(card);
    }
  }
  if (!settlements.childElementCount) settlements.append(text('p', 'Все группы рассчитались.'));
  $('[data-receivable]').textContent = money(receivable);
  $('[data-payable]').textContent = money(payable);
  $('[data-balance]').textContent = signed(receivable - payable);
  $('[data-receivable-note]').textContent = incoming ? 'К получению переводов: ' + incoming : 'Все рассчитались с вами';
  $('[data-payable-note]').textContent = outgoing ? 'К оплате переводов: ' + outgoing : 'У вас нет долгов';
  $('[data-dialog="reminder"]').disabled = !incoming;

  const groupTitle = (id) => state.groups.find((group) => group.id === id)?.title || 'Личный расход';
  const activity = $('.feed');
  const operations = [
    ...state.expenses.slice().reverse().map((item) => ({ item, renderRow: expenseRow })),
    ...state.payments.slice().reverse().map((item) => ({ item, renderRow: paymentRow }))
  ];
  operations.sort((a, b) => (b.item.createdAt || 0) - (a.item.createdAt || 0));
  activity.replaceChildren(...operations.map(({ item, renderRow }) => renderRow(item, groupTitle(item.group))));
  $('[data-collections]').replaceChildren(...state.collections.map(collectionCard));
}

function openDialog(id) {
  const dialog = document.getElementById(id);
  const form = $('form', dialog);
  if (form) {
    form.reset();
    errorIn(form, '');
  }
  dialog.showModal();
}

function setPayers() {
  const group = state.groups.find((item) => item.id === expenseFields.group.value);
  expenseFields.payer.replaceChildren(...(group?.members || [me]).map((name) => new Option(name, name)));
}

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('button[data-dialog], button[data-group], button[data-close]');
  if (!trigger) return;
  if (trigger.hasAttribute('data-close')) {
    trigger.closest('dialog').close();
    return;
  }
  if (trigger.dataset.group) {
    const group = state.groups.find((item) => item.id === trigger.dataset.group);
    const summary = groupSummary(state, group);
    detailGroup = group.id;
    $('#detail-title').textContent = group.title;
    $('[data-detail-members]').textContent = 'Участники: ' + group.members.join(', ');
    const list = $('[data-detail-expenses]');
    list.replaceChildren(...summary.expenses.slice().reverse().map((item) => expenseRow(item, group.title)));
    if (!list.childElementCount) list.append(text('li', 'Здесь появятся расходы группы.'));
    openDialog('group-detail');
    return;
  }
  const id = trigger.dataset.dialog;
  if (id === 'expense') {
    const fromDetail = trigger.closest('#group-detail');
    fromDetail?.close();
    expenseFields.group.replaceChildren(new Option('Личный расход', ''), ...state.groups.map((group) => new Option(group.title, group.id)));
    openDialog(id);
    expenseFields.group.value = fromDetail ? detailGroup : '';
    setPayers();
    return;
  }
  if (id === 'reminder') {
    const messages = [];
    for (const group of state.groups) {
      for (const transfer of groupSummary(state, group).transfers) {
        if (transfer.to === me) messages.push(transfer.from + ', напоминание о переводе ' + money(transfer.cents) + ' за общие расходы «' + group.title + '».');
      }
    }
    $('#reminder textarea').value = messages.join('\n');
    $('#reminder [role=status]').textContent = '';
  }
  openDialog(id);
});

$('[data-copy]').addEventListener('click', async () => {
  const field = $('#reminder textarea');
  const status = $('#reminder [role=status]');
  try {
    await navigator.clipboard.writeText(field.value);
    status.textContent = 'Текст скопирован.';
  } catch {
    field.focus();
    field.select();
    status.textContent = 'Текст выделен. Скопируйте его вручную.';
  }
});

expenseFields.group.addEventListener('change', setPayers);
expenseForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const title = expenseFields.title.value.trim();
  const cents = parseMoney(expenseFields.sum.value);
  if (!validText(title, 80) || !validCents(cents)) return errorIn(expenseForm, 'Введите название и положительную сумму с точностью до копеек.');
  const group = expenseFields.group.value;
  const payer = expenseFields.payer.value;
  save(expenseForm, (next) => {
    if (group && !next.groups.find((item) => item.id === group)?.members.includes(payer)) return 'Выберите группу и участника заново.';
    next.expenses.push({ title, cents, group, payer, createdAt: Date.now() });
  }, 'Расход добавлен.');
});

const groupForm = $('#group form');
groupForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const title = groupForm.elements.title.value.trim();
  const members = membersFrom(groupForm.elements.members.value);
  if (!validText(title, 80) || members.length < 2 || members.length > 20 || members.some((name) => !validText(name, 40))) {
    return errorIn(groupForm, 'Введите название и от 1 до 19 имён участников, каждое до 40 символов.');
  }
  save(groupForm, (next) => {
    next.groups.push({ id: 'group-' + Date.now() + '-' + next.groups.length, title, members });
  }, 'Группа создана.');
});

const collectionForm = $('#collection form');
collectionForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const title = collectionForm.elements.title.value.trim();
  const goal = parseMoney(collectionForm.elements.sum.value);
  if (!validText(title, 80) || !validCents(goal)) return errorIn(collectionForm, 'Введите название и положительную сумму цели.');
  save(collectionForm, (next) => {
    next.collections.push({ id: 'collection-' + Date.now() + '-' + next.collections.length, title, goal, raised: 0 });
  }, 'Сбор создан.');
});

const contributionForm = $('#contribution form');
contributionForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const cents = parseMoney(contributionForm.elements.sum.value);
  if (!validCents(cents)) return errorIn(contributionForm, 'Введите положительную сумму взноса.');
  save(contributionForm, (next) => {
    const collection = next.collections.find((item) => item.id === activeCollection);
    if (!collection || cents > collection.goal - collection.raised) return 'Взнос должен быть не больше оставшейся суммы.';
    collection.raised += cents;
  }, 'Взнос отмечен.');
});

const paymentForm = $('#payment form');
paymentForm.addEventListener('submit', (event) => {
  event.preventDefault();
  save(paymentForm, (next) => {
    const { group: id, from, to, cents } = pendingPayment;
    const group = next.groups.find((item) => item.id === id);
    if (!group || !groupSummary(next, group).transfers.some((item) => item.from === from && item.to === to && item.cents === cents)) {
      return 'Сумма изменилась. Закройте окно и выберите актуальный перевод.';
    }
    next.payments.push({ ...pendingPayment, createdAt: Date.now() });
  }, 'Перевод отмечен в расчётах.');
});

const splitForm = $('.split-form');
splitForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const cents = parseMoney(splitForm.elements.sum.value);
  const people = Number(splitForm.elements.people.value);
  const result = $('.split-form__result');
  if (!validCents(cents) || !Number.isInteger(people) || people < 2 || people > 1000) {
    result.textContent = 'Введите сумму с точностью до копеек и целое число участников от 2 до 1000.';
    return;
  }
  const { share, remainder } = divide(cents, people);
  result.textContent = remainder
    ? (people - remainder) + ' чел. по ' + money(share) + ', ' + remainder + ' чел. по ' + money(share + 1)
    : 'Каждый платит по ' + money(share);
});

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

function showScreen() {
  const hash = location.hash;
  const collections = hash === '#collections';
  const settlements = hash === '#settlements';
  $('[data-home]').hidden = collections || settlements;
  $('#collections').hidden = !(collections || settlements);
  $('#settlements').hidden = !(collections || settlements);
  const active = ['#groups', '#collections', '#settlements'].includes(hash) ? hash : '#home';
  for (const link of menu.querySelectorAll('a')) {
    const current = link.getAttribute('href') === active;
    link.classList.toggle('menu__active', current);
    if (current) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  if (['#groups', '#activity', '#collections', '#settlements'].includes(hash)) document.getElementById(hash.slice(1)).scrollIntoView();
  else window.scrollTo(0, 0);
}

function load() {
  try {
    state = readState();
    render();
  } catch {
    state = { groups: demoGroups, expenses: demoExpenses, payments: [], collections: demoCollections };
    render();
    showStatus('Сохранённые данные недоступны. Показан учебный пример.');
  }
}

window.addEventListener('storage', (event) => {
  if (event.key === storageKey || event.key === null) load();
});
window.addEventListener('hashchange', showScreen);
load();
showScreen();
