// Журнал посещаемости «Навигатора вёрстки» → Google Таблица.
// Сайт отправляет сюда журнал команды, скрипт пишет его на лист с именем кода модератора:
// строки — участники, колонки — даты занятий, в клетках «был» / «не был».
//
// Настройка (один раз):
// 1. Расширения → Apps Script, вставить этот файл целиком вместо кода по умолчанию.
// 2. Настройки проекта (шестерёнка) → Свойства скрипта → свойство CODES,
//    значение — то же, что в секрете MODERATOR_CODES на GitHub (можно вместе с именами).
// 3. Начать развёртывание → Новое развёртывание → тип «Веб-приложение»,
//    «Запуск от имени»: Я, «У кого есть доступ»: Все. Скопировать URL веб-приложения.

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse(e.postData.contents);
    const code = String(data.code || '').trim();
    if (!codes().includes(code)) return reply({ ok: false, error: 'code' });

    const book = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = book.getSheetByName(code) || book.insertSheet(code);
    const head = ['Участник'].concat(data.dates.map((d) => d.label), ['Был']);
    const rows = data.members.map((m) => {
      const cells = data.dates.map((d) => (m.marks[d.iso] === 'y' ? 'был' : m.marks[d.iso] === 'n' ? 'не был' : ''));
      return [safe(m.name)].concat(cells, [cells.filter((c) => c === 'был').length]);
    });

    sheet.clearContents();
    sheet.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold');
    if (rows.length) sheet.getRange(2, 1, rows.length, head.length).setValues(rows);
    const note = 'Обновлено ' + Utilities.formatDate(new Date(), 'Asia/Omsk', 'dd.MM.yyyy HH:mm') + (data.moderator ? ' · ' + safe(data.moderator) : '');
    sheet.getRange(rows.length + 3, 1).setValue(note);
    sheet.setFrozenRows(1);
    sheet.setFrozenColumns(1);
    return reply({ ok: true });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Коды из свойства CODES: «код: имена» по строкам или «код, код» — как в MODERATOR_CODES
function codes() {
  const raw = PropertiesService.getScriptProperties().getProperty('CODES') || '';
  if (raw.indexOf(':') < 0) return raw.split(/[,\n]/).map((c) => c.trim()).filter(Boolean);
  return raw.split(/[;\n]/).map((line) => line.split(':')[0].trim()).filter(Boolean);
}

// Текст, начинающийся с = + - @, таблица посчитала бы формулой
function safe(text) {
  const s = String(text);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
