import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = 'src/blocks/kits';
const cases = JSON.parse(fs.readFileSync('src/data/cases.json', 'utf8'));
const kits = JSON.parse(fs.readFileSync(root + '/manifest.json', 'utf8'));
const read = (theme, file) => fs.readFileSync(path.join(root, theme, file), 'utf8');
const out = process.env.NAV_KITS_DIR || '.astro/site-kits';
const variants = Object.fromEntries(cases.map(item => [item.id, item.blocks]));
variants.own = ['header', 'hero', 'cards', 'footer'];
assert.deepEqual(Object.keys(kits).sort(), Object.keys(variants).sort());

for (const [id, kit] of Object.entries(process.env.NAV_KITS_DIR ? {} : kits)) {
  assert.deepEqual(kit.blocks, variants[id], id);
  const order = [...kit.blocks, 'modal'];
  const sections = Object.fromEntries(order.map(block => [block, read(block === 'modal' ? 'shared' : id, block + '.html')]));
  const { header, footer, modal, ...main } = sections;
  const css = [read('shared', 'base.css'), read(id, 'theme.css'), ...order.map(block => read('shared', block + '.css')), read('shared', 'burger.css')].join('\n');
  const js = ['burger', 'modal', ...order.filter(block => ['form', 'filters'].includes(block))].map(block => read('shared', block + '.js')).join('\n');
  const html = '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Учебный комплект</title><link rel="stylesheet" href="style.css"><script src="script.js" defer></script></head><body>' +
    header + '<main id="main">' + Object.values(main).join('\n') + '</main>' + footer + modal + '</body></html>';
  const used = [...new Set([...html.matchAll(/src="img\/([^"]+)"/g)].map(match => match[1]))];
  assert.deepEqual(used.sort(), Object.keys(kit.images).sort(), id);
  const folder = path.join(out, id);
  fs.mkdirSync(path.join(folder, 'img'), { recursive: true });
  for (const [name, source] of Object.entries(kit.images)) {
    assert.equal(name, path.basename(name));
    fs.copyFileSync(path.join('public', source), path.join(folder, 'img', name));
  }
  fs.writeFileSync(path.join(folder, 'index.html'), html);
  fs.writeFileSync(path.join(folder, 'style.css'), css);
  fs.writeFileSync(path.join(folder, 'script.js'), js);
}

const pw = process.env.NAV_AUDIT_PLAYWRIGHT;
const { chromium } = pw ? await import(pathToFileURL(path.resolve(pw)).href) : await import('playwright');
const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const id of Object.keys(kits)) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route(/^https?:/, route => route.abort());
    await page.goto(pathToFileURL(path.resolve(out, id, 'index.html')).href);
    await page.screenshot({ path: path.join(out, id, 'desktop.png') });
    for (const width of [1280, 769, 768, 375]) {
      await page.setViewportSize({ width, height: 900 });
      const problems = await page.evaluate(() => {
        const issues = [];
        if (document.documentElement.scrollWidth > innerWidth) issues.push('горизонтальная прокрутка');
        if (document.querySelectorAll('h1').length !== 1) issues.push('число h1');
        const ids = [...document.querySelectorAll('[id]')].map(el => el.id);
        if (new Set(ids).size !== ids.length) issues.push('дубли id');
        if ([...document.querySelectorAll('a[href^="#"]')].some(a => !document.getElementById(a.hash.slice(1)))) issues.push('битый якорь');
        if ([...document.images].some(img => !img.naturalWidth || !img.hasAttribute('alt'))) issues.push('картинка или alt');
        return issues;
      });
      assert.deepEqual(problems, [], id + ' / ' + width);
    }
    await page.screenshot({ path: path.join(out, id, 'mobile.png') });
    const toggle = page.locator('.kit-menu-toggle');
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    await toggle.focus();
    await page.keyboard.press('Enter');
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    await page.keyboard.press('Tab');
    assert(await page.locator('.kit-menu a').first().evaluate(el => el === document.activeElement));
    await page.keyboard.press('Escape');
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    assert(await toggle.evaluate(el => el === document.activeElement));
    await toggle.click();
    assert(await page.locator('.kit-menu').isVisible());
    await page.locator('.kit-menu a').first().click();
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    await page.locator('[data-kit-open]').click();
    assert(await page.locator('.kit-dialog:modal').isVisible());
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.kit-dialog').isVisible(), false);
    const opener = page.locator('[data-kit-open]');
    await opener.focus();
    await page.keyboard.press('Enter');
    assert(await page.locator('.kit-dialog:modal').isVisible());
    assert(await page.locator('.kit-dialog').evaluate(el => el.contains(document.activeElement)));
    await page.keyboard.press('Escape');
    assert(await opener.evaluate(el => el === document.activeElement));
    if (id === 'where') {
      await page.locator('[data-kit-filter="free"]').click();
      assert.equal(await page.locator('.kit-card[data-kit-category]:visible').count(), 2);
      await page.locator('[data-kit-filter="all"]').click();
      assert.equal(await page.locator('.kit-card[data-kit-category]:visible').count(), 3);
    }
    if (id === 'tail') {
      await page.locator('.kit-form button').click();
      assert.match(await page.locator('.kit-form [role=status]').textContent(), /имя/i);
      await page.locator('.kit-form input[name=name]').fill('Аня');
      await page.locator('.kit-form input[name=email]').fill('anya@example.test');
      await page.locator('.kit-form button').click();
      assert.match(await page.locator('.kit-form [role=status]').textContent(), /проверена/i);
    }
    assert.deepEqual(errors, [], id);
    await page.close();
    console.log('PASS ' + id);
  }
} finally {
  await browser.close();
}
