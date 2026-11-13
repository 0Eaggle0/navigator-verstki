import kits from '../blocks/kits/manifest.json';
import { srcdoc } from './srcdoc';

const files = import.meta.glob<string>('/src/blocks/**/*.{html,css,js}', { query: '?raw', import: 'default', eager: true });
const read = (name: string) => files['/src/blocks/' + name];
const kitFile = (name: string) => read('kits/' + name);
const shared = (name: string) => kitFile('shared/' + name);

export function blockVariants(id: string, assetUrl: (path: string) => string) {
  const variants = Object.fromEntries(Object.entries(kits).map(([theme, kit]) => {
    const source = kit.blocks.includes(id)
      ? theme
      : id === 'cards' ? 'own' : Object.keys(kits).find(key => kits[key as keyof typeof kits].blocks.includes(id));
    const base = shared('base.css') + '\n' + kitFile(theme + '/theme.css');
    const css = id === 'base' ? base : shared(id + '.css');
    const html = id === 'base' || id === 'burger' ? undefined : id === 'modal' ? shared('modal.html') : kitFile(source + '/' + id + '.html');
    const js = shared(id + '.js');
    const previewHtml = id === 'base' ? '<main class="kit-container kit-section"><h2>Заголовок страницы</h2><p>Пример текста в выбранных цветах.</p><button class="kit-button" type="button">Кнопка</button></main>'
      : id === 'burger' ? kitFile(theme + '/header.html')
      : id === 'modal' ? '<div class="kit-container kit-section"><button class="kit-button" type="button" data-kit-open>О проекте</button></div>' + html
      : id === 'filters' ? html + kitFile('where/cards.html') : html ?? '';
    const previewCss = id === 'base' ? base
      : base + '\n' + (id === 'burger' ? shared('header.css') : id === 'filters' ? shared('cards.css') : '') + '\n' + css;
    const images = {
      ...(source ? kits[source as keyof typeof kits].images : {}),
      ...(id === 'filters' ? kits.where.images : {}),
    } as Record<string, string>;
    const preview = previewHtml.replace(/src="img\/([^"]+)"/g, (match, name) =>
      images[name] ? 'src="' + assetUrl(images[name]) + '"' : match);
    const downloads = [...(html ?? '').matchAll(/src="img\/([^"]+)"/g)].map(([, name]) => ({ name, href: assetUrl(images[name]) }));
    return [theme, { label: kit.title + (theme !== 'own' && !kit.blocks.includes(id) && !['base', 'burger', 'modal'].includes(id) ? ' · универсальная секция' : ''), html, css, js, doc: srcdoc(preview, previewCss, js), downloads }];
  }));
  if (id !== 'base') {
    const html = read(id + '.html');
    const css = read(id + '.css');
    const js = read(id + '.js');
    const downloads = [...(html ?? '').replace(/<!--[\s\S]*?-->/g, '').matchAll(/src="img\/([^"]+)"/g)]
      .map(([, name]) => ({ name, href: assetUrl('img/' + name) }));
    variants.classic = { label: 'Исходный универсальный шаблон', html, css, js, doc: srcdoc(html, css, js), downloads };
  }
  return variants;
}
