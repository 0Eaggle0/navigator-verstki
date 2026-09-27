// Собирает HTML-документ для превью в <iframe srcdoc>.
// Картинки из public/img доступны в примерах как src="img/barsik.svg".
// <base> Chrome в srcdoc применяет не сразу и сначала запрашивает картинку по адресу
// страницы (лишняя ошибка 404), поэтому путь img/ дописываем до полного прямо в коде.
const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');

export const srcdoc = (html: string, css: string) =>
	`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><base href="${base}"><style>body{font-family:system-ui,sans-serif;margin:8px}</style><style>${css}</style></head><body>${html.replaceAll('src="img/', `src="${base}img/`)}</body></html>`;
