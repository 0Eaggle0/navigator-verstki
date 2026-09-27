// Собирает HTML-документ для превью в <iframe srcdoc>.
// Картинки из public/img доступны в примерах как src="img/barsik.svg".
// <base> Chrome в srcdoc применяет не сразу и сначала запрашивает картинку по адресу
// страницы (лишняя ошибка 404), поэтому путь img/ дописываем до полного прямо в коде.
// Исходный путь остаётся в data-src — его видят автопроверки.
const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');

// Перехват console.log и ошибок внутри превью: всё отправляется странице-песочнице
// сообщением { sandbox: true, kind, text, line }. Номер строки считается от начала кода ученика.
const consoleHook = (offset: number) => `<script>(() => {
const show = (v) => v && v.nodeType === 1 ? '<' + v.tagName.toLowerCase() + '>' : typeof v === 'object' ? (() => { try { return JSON.stringify(v); } catch { return String(v); } })() : String(v);
const send = (kind, text, line) => parent.postMessage({ sandbox: true, kind, text, line }, '*');
for (const kind of ['log', 'info', 'warn', 'error']) {
  const original = console[kind].bind(console);
  console[kind] = (...args) => { send(kind, args.map(show).join(' ')); original(...args); };
}
addEventListener('error', (e) => send('error', e.message, e.lineno ? e.lineno - ${offset} : 0));
})();</script>`;

export const srcdoc = (html: string, css: string, js?: string) => {
	const head = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><base href="${base}"><style>body{font-family:system-ui,sans-serif;margin:8px}</style><style>${css}</style>`;
	const body = `</head><body>${html.replace(/src="img\/([^"]*)"/g, `src="${base}img/$1" data-src="img/$1"`)}`;
	if (js === undefined) return head + body + '</body></html>';
	// Код ученика — отдельным <script> в конце body: к этому моменту весь HTML уже на странице
	const before = head + consoleHook(0) + body + '\n<script>\n';
	const offset = before.split('\n').length - 1;
	return head + consoleHook(offset) + body + '\n<script>\n' + js + '\n</script></body></html>';
};
