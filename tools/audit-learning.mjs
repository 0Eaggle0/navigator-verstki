// Аудит заданий и пути ученика в отдельном профиле Chrome. Команды — в docs/learning-final-audit-2026-11-13.md.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import yaml from 'js-yaml';
import { edgeCases, referenceOverrides, equivalents } from './audit-learning-fixtures.mjs';

const root = 'src/content/docs';
const out = '.astro/audit-learning';
let base = process.env.NAV_AUDIT_URL || 'http://localhost:4322';
const phase = process.argv[2] || 'practice';
const pages = fs.readdirSync(root, { recursive: true }).filter(f => f.endsWith('.mdx')).flatMap(file => {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const fm = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return [];
  const data = yaml.load(fm[1]);
  if (!data.warmup || data.lesson < 3) return [];
  const hint = source.match(/<Hint title="(?:Решение|Разбор разминки)"(?: afterPractice)?>([\s\S]*?)<\/Hint>/)?.[1] || '';
  const snippets = [...hint.matchAll(/(```|~~~)(html|css|js)\r?\n([\s\S]*?)\1/g)];
  const solution = { html: data.warmup.html || '', css: data.warmup.css || '', ...(data.warmup.js !== undefined ? { js: data.warmup.js } : {}) };
  const seen = new Set();
  for (const [, , lang, code] of snippets) {
    if (seen.has(lang)) continue; // 7.1 содержит два альтернативных JS-примера; разминка — фильтр.
    seen.add(lang);
    solution[lang] = lang === 'css' ? solution.css + '\n' + code : code;
  }
  return [{ id: file.replaceAll('\\', '/').replace(/\.mdx$/, ''), file, ...data, solution }];
});
assert.equal(pages.length, 32, 'Объём аудита изменился: обновите ожидаемый список');
const gameLevelCount = pages.reduce((n, p) => n + (p.game?.levels.length || 0), 0);
for (const id of [...Object.keys(referenceOverrides), ...edgeCases.map(e => e.id), ...equivalents.map(e => e.id)]) assert(pages.some(p => p.id === id), id);
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'inventory.json'), JSON.stringify(pages, null, 2));

const pw = process.env.NAV_AUDIT_PLAYWRIGHT;
const { chromium } = pw ? await import(pathToFileURL(path.resolve(pw)).href) : await import('playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let server;
if (process.env.NAV_AUDIT_DIST) {
  const dir = path.resolve(process.env.NAV_AUDIT_DIST);
  const prefix = process.env.NAV_AUDIT_PREFIX || '';
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
  server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (!pathname.startsWith(prefix + '/')) { res.writeHead(404).end(); return; }
    const name = pathname.slice(prefix.length);
    const file = path.resolve(dir, '.' + (name.endsWith('/') ? name + 'index.html' : name));
    if (!file.startsWith(dir + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  base = 'http://127.0.0.1:' + server.address().port + prefix;
}
const results = process.argv.includes('--resume')
  ? JSON.parse(fs.readFileSync(path.join(out, phase + '.json'), 'utf8')).results : [];
const metadata = { date: new Date().toISOString(), browser: browser.version(), base, phase };
const save = () => fs.writeFileSync(path.join(out, phase + '.json'), JSON.stringify({ ...metadata, results }, null, 2));

async function open(p, initialStorage = {}, disableStorage = false) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.route(/^https?:/, route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
  await context.addInitScript(({ initialStorage, disableStorage }) => {
    if (window !== window.top) return;
    if (!localStorage.getItem('nav-v1')) localStorage.setItem('nav-v1', JSON.stringify({ profile: { name: 'Аудит', team: 'Тест', role: 'student' } }));
    if (!sessionStorage.getItem('audit-seeded')) {
      for (const [key, value] of Object.entries(initialStorage)) localStorage.setItem(key, value);
      sessionStorage.setItem('audit-seeded', '1');
    }
    if (disableStorage) Storage.prototype.setItem = () => { throw new Error('Хранилище выключено'); };
  }, { initialStorage, disableStorage });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // Незавершённая форма меняет адрес iframe на about:srcdoc?name=…; ждём проверку, а не networkidle.
  await page.goto(base + '/' + p.id + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('.block__theme:not([hidden]), .gallery__theme:not([hidden])') ||
    document.querySelector('.sandbox__check')?.disabled === false ||
    /Проверка:|Всё верно/.test(document.querySelector('.sandbox__checks')?.textContent || ''));
  return { page, context, errors };
}

async function result(page) {
  return page.locator('nav-sandbox').evaluate(el => ({
    accepted: el.querySelector('.sandbox__checks').classList.contains('is-ok'),
    feedback: el.querySelector('.sandbox__checks').textContent.trim(),
    recorded: JSON.parse(localStorage.getItem('nav-v1') || '{}').solved?.includes(el.dataset.id) || false,
    checkerUrl: (el.querySelector('.sandbox__checker') || el.querySelector('iframe')).contentDocument?.URL,
  }));
}

async function setCode(page, code) {
  await page.locator('nav-sandbox').evaluate((el, code) => {
    for (const field of el.querySelectorAll('textarea')) if (field.name in code) {
      field.value = code[field.name];
      field.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, code);
  const button = page.locator('.sandbox__check');
  if (await button.count()) await button.evaluate(el => el.click());
  else await page.waitForTimeout(1150);
  await page.waitForFunction(() => {
    const s = document.querySelector('nav-sandbox');
    return s.querySelector('.sandbox__checks').matches('.is-ok, .is-wip');
  });
  const check = await result(page);
  assert(!/Проверка не завершилась|Не удалось установить ширину/.test(check.feedback), check.feedback);
  return check;
}

function reference(p) {
  const override = referenceOverrides[p.id];
  return override ? { ...p.solution, ...override, css: override.css === undefined ? p.solution.css : (p.warmup.css || '') + '\n' + override.css } : p.solution;
}

try {
  if (phase === 'practice') {
    for (const p of pages) {
      if (results.some(r => r.id === p.id)) continue;
      const { page, context, errors } = await open(p);
      try {
        const initial = await result(page);
        const start = await setCode(page, { html: p.warmup.html || '', css: p.warmup.css || '', js: p.warmup.js });
        const empty = await setCode(page, { html: '', css: '', ...(p.warmup.js !== undefined ? { js: '' } : {}) });
        const published = await setCode(page, p.solution);
        const correct = await setCode(page, reference(p));
        const partialCode = p.warmup.js !== undefined
          ? { ...reference(p), js: '' }
          : p.solution.html !== p.warmup.html
            ? { ...reference(p), html: '<div>Мурка Контакты</div>' }
            : { ...reference(p), css: p.warmup.css || '' };
        const partial = await setCode(page, partialCode);
        results.push({ id: p.id, initial, start, empty, published, correct, partial, pageErrors: errors });
        save();
        console.log(JSON.stringify({ id: p.id, initial: initial.accepted, empty: empty.accepted, published: published.accepted, correct: correct.accepted, partial: partial.accepted }));
      } finally { await context.close(); }
    }
    assert.equal(results.length, pages.length);
    if (process.argv.includes('--verify')) {
      assert(results.every(r => r.correct.accepted && r.correct.recorded), 'Не все эталоны получили зачёт');
      assert.deepEqual(results.filter(r => !r.published.accepted).map(r => r.id), [], 'Опубликованный разбор не проходит проверку');
      assert(results.every(r => !r.initial.recorded && !r.start.accepted && !r.empty.accepted && !r.partial.accepted));
    }
  } else if (phase === 'games') {
    for (const p of pages.filter(p => p.game)) {
      const { page, context } = await open(p);
      try {
        const levels = [];
        for (let n = 0; n < p.game.levels.length; n++) {
          await page.locator('.game__pips button').nth(n).click();
          const l = p.game.levels[n];
          if (p.game.type === 'ghost') {
            await page.waitForTimeout(200);
            const initial = await page.locator('.game__status').textContent();
            await page.locator('nav-game textarea').fill(l.target);
            await page.waitForTimeout(400);
            const solved = await page.locator('.game__status').textContent();
            const geometry = await page.locator('nav-game iframe').evaluate(el => [...el.contentDocument.querySelectorAll('#play .board > *')].map(x => ({ width: x.getBoundingClientRect().width, height: x.getBoundingClientRect().height })));
            levels.push({ n: n + 1, task: l.task, initial, solved, accepted: solved.includes('Все на месте'), geometry });
          } else {
            const attempts = [];
            for (let i = 0; i < await page.locator('.game__options button').count(); i++) {
              const b = page.locator('.game__options button').nth(i);
              const answer = await b.textContent();
              await b.click();
              const status = await page.locator('.game__status').textContent();
              attempts.push({ answer, status });
              if (status.includes('Верно!')) break;
            }
            levels.push({ n: n + 1, task: l.task, accepted: attempts.at(-1).status.includes('Верно!'), attempts });
          }
        }
        const recorded = await page.evaluate(id => JSON.parse(localStorage.getItem('nav-v1') || '{}').games?.includes(id), p.id);
        results.push({ id: p.id, type: p.game.type, levels, recorded });
        save();
        console.log(JSON.stringify({ id: p.id, accepted: levels.filter(x => x.accepted).length, total: levels.length, recorded }));
      } finally { await context.close(); }
    }
    assert.equal(results.reduce((n, r) => n + r.levels.length, 0), gameLevelCount);
    if (process.argv.includes('--verify')) {
      assert.equal(gameLevelCount, 36);
      assert(results.every(r => r.recorded && r.levels.every(l => l.accepted)));
    }
  } else if (phase === 'edges') {
    for (const e of [...edgeCases, ...equivalents]) {
      if (results.some(r => r.id === e.id && r.name === e.name)) continue;
      const p = pages.find(p => p.id === e.id);
      const { page, context } = await open(p);
      try {
        const code = e.make(reference(p), p.warmup);
        const check = await setCode(page, code);
        const observation = e.observe ? await e.observe(page) : null;
        results.push({ id: e.id, name: e.name, expected: e.expected || 'reject', ...check, observation, code });
        save();
        console.log(JSON.stringify({ id: e.id, name: e.name, accepted: check.accepted, observation }));
      } finally { await context.close(); }
    }
    assert.equal(results.length, edgeCases.length + equivalents.length);
    if (process.argv.includes('--verify')) {
      assert.deepEqual(results.filter(r => r.accepted !== (r.expected === 'accept')).map(r => r.id + ': ' + r.name), []);
    }
  } else if (phase === 'layout') {
    const { page, context } = await open({ id: 'blocks/base' });
    try {
      for (let n = 0; n < 20; n++) {
        for (const id of ['lesson-3/3-2-menu', 'lesson-4/4-1-grid', 'lesson-5/5-2-mobile-375']) {
          await page.goto(base + '/' + id + '/');
          await page.waitForFunction(() => document.querySelector('.sandbox__check')?.disabled === false);
          const check = await setCode(page, pages.find(p => p.id === id).solution);
          results.push({ n, id, ...check });
          assert(check.accepted, id + ': ' + check.feedback);
        }
      }
    } finally { await context.close(); }
  } else if (phase === 'assemble') {
    const kits = JSON.parse(fs.readFileSync('src/blocks/kits/manifest.json', 'utf8'));
    const practices = JSON.parse(fs.readFileSync('src/data/block-practices.json', 'utf8'));
    const { page, context, errors } = await open({ id: 'blocks/base' });
    try {
      for (const id of new Set(Object.values(practices))) {
        await page.goto(base + '/' + id + '/');
        await page.locator('.sandbox__check').waitFor();
        const check = await setCode(page, reference(pages.find(p => p.id === id)));
        assert(check.accepted, id + ': ' + check.feedback);
      }
      for (const [theme, kit] of Object.entries(kits)) {
        const folder = path.join(out, 'assembled', theme);
        fs.mkdirSync(path.join(folder, 'img'), { recursive: true });
        const snippets = {};
        const images = new Set();
        for (const block of ['base', ...kit.blocks, 'burger', 'modal']) {
          await page.goto(base + '/blocks/' + block + '/');
          await page.locator('.block__code').waitFor();
          await page.locator('.block__theme select').selectOption(theme);
          const files = await page.locator('.block__file option').evaluateAll(options => options.filter(o => !o.hidden).map(o => o.value));
          snippets[block] = {};
          for (const file of files) {
            await page.locator('.block__file').selectOption(file);
            const code = await page.locator('.block__code textarea').inputValue();
            assert(code.trim(), theme + '/' + block + '/' + file);
            snippets[block][file] = code;
          }
          for (const link of await page.locator('.block__downloads a').all()) {
            const name = await link.getAttribute('download');
            assert.equal(name, path.basename(name));
            const href = await link.getAttribute('href');
            assert(href.startsWith(new URL(base).pathname + '/'), href);
            const response = await context.request.get(new URL(href, base).href);
            assert(response.ok(), href);
            fs.writeFileSync(path.join(folder, 'img', name), await response.body());
            images.add(name);
          }
        }
        const main = kit.blocks.filter(id => !['header', 'footer'].includes(id)).map(id => snippets[id].html).join('\n');
        fs.writeFileSync(path.join(folder, 'index.html'), '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Сайт из библиотеки</title><link rel="stylesheet" href="style.css"><script src="script.js" defer></script></head><body>' + snippets.header.html + '<main id="main">' + main + '</main>' + snippets.footer.html + snippets.modal.html + '</body></html>');
        for (const [ext, filename] of [['css', 'style.css'], ['js', 'script.js']]) {
          fs.writeFileSync(path.join(folder, filename), Object.values(snippets).map(s => s[ext] || '').join('\n'));
        }
        assert.deepEqual([...images].sort(), Object.keys(kit.images).sort(), theme);
        await page.reload();
        await page.locator('.block__code').waitFor();
        assert.equal(await page.locator('.block__theme select').inputValue(), theme);
        results.push({ theme, blocks: Object.keys(snippets), images: [...images] });
        console.log('ASSEMBLED ' + theme);
      }
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  } else if (phase === 'moderator') {
    // Only the isolated build uses this public test credential; never read real .env codes.
    const code = 'audit-only-7';
    for (const disableStorage of [false, true]) {
      const { page, context, errors } = await open({ id: 'blocks/base' }, {}, disableStorage);
      try {
        await page.goto(base + '/moderator/');
        await page.locator('.mod-lock').waitFor();
        assert.equal(await page.locator('mod-secret').getAttribute('data-payload') !== null, true);
        await page.locator('.mod-lock input').fill('wrong-audit-code');
        await page.locator('.mod-lock button').click();
        await page.locator('.mod-lock__error:not([hidden])').waitFor();
        assert.match(await page.locator('.mod-lock__error').textContent(), /не подходит/);
        await page.locator('.mod-lock input').fill(code);
        await page.locator('.mod-lock button').click();
        await page.locator('.mod-lock').waitFor({ state: 'detached' });
        assert((await page.locator('mod-secret').textContent()).length > 1000);
        assert.equal(await page.locator('html').getAttribute('data-role'), 'moderator');
        await page.reload();
        if (disableStorage) await page.locator('.mod-lock').waitFor();
        else {
          await page.waitForFunction(() => document.documentElement.hasAttribute('data-mod-open'));
          assert.equal(await page.locator('.mod-lock').count(), 0);
          assert.match(await page.locator('nav-attendance').textContent(), /AuditMemberSeven/);
          await page.goto(base + '/moderator/sites/');
          await page.waitForFunction(() => document.documentElement.hasAttribute('data-mod-open'));
          assert.equal(await page.locator('.mod-lock').count(), 0);
        }
        assert.deepEqual(errors, []);
        results.push({ disableStorage, passed: true });
      } finally { await context.close(); }
    }
    const dir = process.env.NAV_AUDIT_DIST;
    assert(dir, 'Проверка приватности требует NAV_AUDIT_DIST');
    for (const file of fs.readdirSync(dir, { recursive: true })) {
      const filename = path.join(dir, file);
      if (!fs.statSync(filename).isFile()) continue;
      const data = fs.readFileSync(filename);
      assert(!data.includes(Buffer.from(code)), 'Код раскрыт в ' + file);
      assert(!data.includes(Buffer.from('AuditMemberSeven')), 'Имя раскрыто в ' + file);
    }
    for (const route of ['moderator', 'moderator/sites']) {
      const html = fs.readFileSync(path.join(dir, route, 'index.html'), 'utf8');
      assert.match(html, /<mod-secret[^>]+data-payload="[^"]+"><\/mod-secret>/);
    }
  } else if (phase === 'registration') {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
    try {
      const page = await context.newPage();
      await page.goto(base + '/blocks/base/');
      await page.locator('.profile__dialog[open]').waitFor();
      assert.equal(await page.locator('[name=part]').count(), 0);
      await page.locator('.profile__form button[value=save]').click();
      assert(await page.locator('.profile__error').isVisible());
      await page.locator('.profile__form [name=name]').fill('Новый ученик');
      await page.locator('.profile__form [name=team]').fill('Команда 7');
      await page.locator('.profile__form [name=case]').selectOption('own');
      await page.locator('.profile__form [name=caseTitle]').fill('Настольные игры');
      await page.locator('.profile__form button[value=save]').focus();
      await page.keyboard.press('Enter');
      await page.locator('.profile__dialog[open]').waitFor({ state: 'detached' });
      await page.reload();
      await page.locator('.block__theme').waitFor();
      assert.equal(await page.locator('.profile__dialog[open]').count(), 0);
      const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('nav-v1')));
      assert.deepEqual(progress.profile, { name: 'Новый ученик', team: 'Команда 7', role: 'student' });
      assert.equal(progress.caseTitle, 'Настольные игры');
      await page.goto(base + '/tasks/site-base/');
      const editor = page.locator('textarea[name=css]');
      await editor.focus();
      await page.keyboard.press('Tab');
      assert.equal(await editor.inputValue(), '  ');
      await page.keyboard.press('Escape');
      await page.keyboard.press('Tab');
      assert.equal(await editor.evaluate(el => el === document.activeElement), false);
      results.push({ passed: true, width: 375 });
    } finally { await context.close(); }
  } else if (phase === 'profile') {
    const old = { profile: { name: 'Аня', team: '3', role: 'student', part: 3 }, case: 'tail', solved: ['lesson-3/3-2-menu'], practicePass: { 'lesson-3/3-2-menu': 1 }, drafts: { example: { html: 'текст', css: '' } }, badges: ['first'] };
    const { page, context } = await open({ id: 'lesson-3/3-2-menu' }, { 'nav-v1': JSON.stringify(old) });
    try {
      assert.equal(await page.locator('nav-team').count(), 0);
      await page.locator('.profile__chip').click();
      assert.equal(await page.locator('select[name=part]').count(), 0);
      assert.equal(await page.locator('[name=name]').inputValue(), 'Аня');
      await page.locator('[name=name]').fill('Аня 2');
      await page.locator('input[name=role][value=moderator]').check();
      await page.locator('.profile__form button[value=save]').click();
      const current = await page.evaluate(() => JSON.parse(localStorage.getItem('nav-v1')));
      assert.equal(current.profile.name, 'Аня 2');
      assert.equal(current.profile.part, 3);
      assert.equal(current.profile.role, 'moderator');
      assert.equal(current.case, old.case);
      assert.deepEqual(current.solved, old.solved);
      assert.deepEqual(current.practicePass, old.practicePass);
      assert.deepEqual(current.drafts, old.drafts);
      assert(old.badges.every(b => current.badges.includes(b)));
      assert.equal(await page.locator('html').getAttribute('data-role'), 'moderator');
      await page.reload();
      assert.equal(await page.locator('html').getAttribute('data-role'), 'moderator');
      await page.goto(base + '/lesson-1/1-2-setup/');
      assert.equal(await page.locator('nav-team').count(), 0);
    } finally { await context.close(); }
  } else if (phase === 'block-library') {
    const practices = JSON.parse(fs.readFileSync('src/data/block-practices.json', 'utf8'));
    const seed = { profile: { name: 'Аудит', role: 'student' }, case: 'tail', solved: Object.values(practices), hints: ['old'] };
    const { page, context } = await open({ id: 'blocks/header' }, { 'nav-v1': JSON.stringify(seed) });
    try {
      for (const block of Object.keys(practices)) {
        await page.goto(base + '/blocks/' + block + '/');
        await page.locator('.block__theme').waitFor();
        assert.equal(await page.locator('.block__code').isVisible(), false, block);
        assert.equal(await page.locator('.block__code textarea').inputValue(), '', block);
        assert(await page.locator('nav-block > iframe').isVisible());
        assert.match(await page.locator('.block__practice').getAttribute('href'), new RegExp(practices[block] + '/\\?block=' + block));
      }
      await page.goto(base + '/blocks/base/');
      await page.locator('.block__practice').click();
      const task = pages.find(p => p.id === practices.base);
      assert.equal((await setCode(page, { html: task.warmup.html, css: '' })).accepted, false);
      assert.equal(await page.locator('.sandbox__return').isVisible(), false);
      const baseCheck = await setCode(page, reference(task));
      assert.equal(baseCheck.accepted, true, baseCheck.feedback);
      await page.locator('.sandbox__return').click();
      await page.locator('.block__code').waitFor();
      assert.match(await page.locator('.block__code textarea').inputValue(), /#bd5410/);
      await page.locator('.block__theme select').selectOption('split');
      assert.match(await page.locator('.block__code textarea').inputValue(), /#ae1e5a/);
      await page.reload();
      await page.locator('.block__code').waitFor();
      assert.match(await page.locator('.block__code textarea').inputValue(), /#ae1e5a/);
      await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: async () => { throw new Error('Clipboard blocked'); } },
      }));
      await page.locator('[data-copy]').click();
      assert.match(await page.locator('.block__status').textContent(), /Ctrl\+C/);
      assert(await page.locator('.block__code textarea').evaluate(el => el.selectionEnd > el.selectionStart));
      const hints = await page.evaluate(() => JSON.parse(localStorage.getItem('nav-v1')).hints);
      assert.deepEqual(hints, ['old']);
      await page.goto(base + '/blocks/');
      await page.locator('.gallery__theme').waitFor();
      assert.match(await page.locator('.gallery__case:visible').textContent(), /Скинемся/);
      assert.equal(await page.locator('.gallery__availability').filter({ hasText: 'Код открыт' }).count(), 1);
      await page.goto(base + '/blocks/reviews/');
      await page.locator('.block__theme').waitFor();
      assert.match(await page.locator('.block__variant').textContent(), /универсальная секция/);
      await page.locator('.block__theme select').selectOption('classic');
      assert.equal(await page.locator('.block__code').isVisible(), false);
      await page.goto(base + '/tasks/progress-bar/');
      const progress = pages.find(p => p.id === practices.progress);
      assert.equal((await setCode(page, { html: progress.warmup.html, css: '' })).accepted, false);
      const progressCheck = await setCode(page, reference(progress));
      assert.equal(progressCheck.accepted, true, progressCheck.feedback);
    } finally { await context.close(); }
    const local = await open({ id: 'blocks/header' }, {}, true);
    try {
      assert(await local.page.locator('.block__local').isVisible());
      const task = pages.find(p => p.id === practices.header);
      const localCheck = await setCode(local.page, reference(task));
      assert.equal(localCheck.accepted, true, localCheck.feedback);
      assert(await local.page.locator('.block__code').isVisible());
      await local.page.reload();
      await local.page.locator('.block__theme').waitFor();
      assert.equal(await local.page.locator('.block__code').isVisible(), false);
    } finally { await local.context.close(); }
    const noJs = await browser.newContext({ javaScriptEnabled: false });
    try {
      const page = await noJs.newPage();
      await page.goto(base + '/blocks/header/');
      assert.equal(await page.locator('.block__code').isVisible(), false);
      assert(await page.locator('nav-block noscript').isVisible());
    } finally { await noJs.close(); }
  } else if (phase === 'practice-content') {
    const oldId = 'lesson-6/6-1-script';
    const old = { profile: { name: 'Аудит', role: 'student' }, games: [oldId], solved: [oldId], badges: ['old-badge'] };
    const { page, context } = await open({ id: oldId }, { 'nav-v1': JSON.stringify(old) });
    try {
      assert.equal(await page.locator('nav-game').count(), 0, 'На странице остался тест с вариантами');
      const summary = page.locator('details[data-after-practice] summary').first();
      assert.equal(await summary.getAttribute('aria-disabled'), 'true');
      await summary.evaluate(el => el.click());
      assert.equal(await summary.evaluate(el => el.parentElement.open), false);
      assert.equal((await setCode(page, reference(pages.find(p => p.id === oldId)))).accepted, true);
      assert.equal(await summary.getAttribute('aria-disabled'), 'false');
      await summary.click();
      assert.equal(await summary.evaluate(el => el.parentElement.open), true);
      const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('nav-v1')));
      assert.deepEqual(progress.games, old.games);
      assert(old.badges.every(badge => progress.badges.includes(badge)));
      assert(!progress.hints.includes(oldId));
      await page.reload();
      await page.waitForFunction(() => document.querySelector('details[data-after-practice] summary')?.getAttribute('aria-disabled') === 'false');
      await page.goto(base + '/tasks/');
      assert.equal(await page.locator(`li[data-kind="game"][data-id="${oldId}"]`).count(), 0);
      assert.equal(await page.locator(`li[data-kind="warmup"][data-id="${oldId}"] a[href$="/#разминка"]`).count(), 1);
    } finally { await context.close(); }
  } else if (phase === 'check-button') {
    const p = pages.find(p => p.id === 'tasks/js-counter');
    const { page, context } = await open(p);
    try {
      await page.locator('textarea[name=js]').fill(reference(p).js);
      await page.waitForTimeout(1100);
      assert.equal((await result(page)).recorded, false, 'Зачёт появился до нажатия «Проверить»');
      assert.equal((await setCode(page, reference(p))).recorded, true);
      await page.locator('textarea[name=js]').fill('const n = 1;');
      assert.equal((await result(page)).accepted, false, 'Результат относится к предыдущей версии кода');
    } finally { await context.close(); }
  } else if (phase === 'check-storage') {
    const p = pages.find(p => p.id === 'lesson-7/7-2-localstorage');
    const favorites = '["barsik"]';
    const { page, context } = await open(p, { favorites });
    try {
      const read = () => page.evaluate(() => localStorage.getItem('favorites'));
      assert.equal(await read(), favorites);
      assert.equal((await setCode(page, reference(p))).accepted, true);
      assert.equal(await read(), favorites, 'Проверка не должна изменять избранное в превью');
      assert.equal((await setCode(page, reference(p))).accepted, true);
      assert.equal(await read(), favorites);
    } finally { await context.close(); }
  } else if (phase === 'legacy') {
    for (const [id, code] of [
      ['lesson-1/1-2-setup', { html: '<h1>Мой проект</h1>', css: 'h1 { color: red; }' }],
      ['lesson-2/2-4-header', null],
    ]) {
      const { page, context } = await open({ id });
      try {
        assert.equal(await page.locator('.sandbox__check').count(), 0);
        assert.equal((await result(page)).accepted, false);
        if (code) assert.equal((await setCode(page, code)).recorded, true);
      } finally { await context.close(); }
    }
  } else if (phase === 'behavior') {
    for (const p of pages.filter(p => p.game?.type === 'ghost')) {
      const { page, context } = await open(p);
      try {
        const levels = [];
        for (let n = 0; n < p.game.levels.length; n++) {
          await page.locator('.game__pips button').nth(n).click();
          await page.locator('nav-game textarea').fill('} .board>*{display:none} #play .board{');
          await page.waitForTimeout(450);
          const state = await page.locator('nav-game iframe').evaluate(el => ({
            visible: [...el.contentDocument.querySelectorAll('#play .board>*')].filter(x => x.getClientRects().length).length,
            total: el.contentDocument.querySelectorAll('#play .board>*').length,
          }));
          levels.push({ n: n + 1, ...state, accepted: (await page.locator('.game__status').textContent()).includes('Все на месте') });
        }
        results.push({ id: p.id, name: 'Скрытие обеих досок через поле CSS', levels });
        save();
        console.log(JSON.stringify({ id:p.id, bypassed:levels.filter(l=>l.accepted && !l.visible).length,total:levels.length }));
      } finally { await context.close(); }
    }
    const p = pages.find(p => p.id === 'lesson-7/7-2-localstorage');
    const { page, context } = await open(p, { favorites: '["sharik"]', 'audit-unrelated': 'keep' });
    try {
      const afterOpen = await page.evaluate(() => ({ favorites:localStorage.getItem('favorites'), unrelated:localStorage.getItem('audit-unrelated') }));
      const check = await setCode(page, reference(p));
      await page.locator('nav-sandbox iframe:not(.sandbox__checker)').evaluate(el => el.contentDocument.querySelector('[data-id=sharik] .fav').click());
      const afterClick = await page.evaluate(() => localStorage.getItem('favorites'));
      await setCode(page, { ...reference(p), css: reference(p).css + '\n/* правка оформления */' });
      const afterEdit = await page.evaluate(() => localStorage.getItem('favorites'));
      results.push({ id:p.id,name:'Проверка стирает favorites',seed:'["sharik"]',afterOpen,accepted:check.accepted,afterClick,afterEdit });
      console.log(JSON.stringify(results.at(-1)));
      save();
    } finally { await context.close(); }
    assert.equal(results.length, 9);
    if (process.argv.includes('--verify')) {
      assert(results.flatMap(r => r.levels || []).every(l => !l.accepted && l.visible === l.total));
    }
  } else if (phase === 'form-navigation') {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.addInitScript(() => localStorage.setItem('nav-v1', JSON.stringify({profile:{name:'Аудит',role:'student'}})));
    const page = await context.newPage();
    const navigations = [];
    page.on('request', request => {
      if (request.isNavigationRequest()) navigations.push({ url:request.url(), subframe:!!request.frame().parentFrame() });
    });
    try {
      await page.goto(base + '/tasks/js-form/', {waitUntil:'domcontentloaded'});
      await page.waitForTimeout(4000);
      results.push({ id:'tasks/js-form',name:'Незавершённая форма отправляется проверкой',navigations,frames:page.frames().map(f=>f.url()),feedback:await page.locator('nav-sandbox .sandbox__checks').textContent() });
      save();
      console.log(JSON.stringify(results.at(-1)));
    } finally { await context.close(); }
  } else throw new Error('Неизвестный этап: ' + phase);
} finally {
  save();
  await browser.close();
  server?.close();
}
