// Автопроверки разминки. Правила пишутся во frontmatter шага (поле warmup.checks),
// сюда приходит документ из iframe с кодом ученика.

export type Check = {
	fail: string;
	exists?: string;
	selector?: string;
	style?: Record<string, string>;
	text?: string;
	attr?: string;
	count?: { selector: string; min: number };
	js?: string;
};

function pass(doc: Document, c: Check): boolean {
	if (c.exists) return !!doc.querySelector(c.exists);
	if (c.count) return doc.querySelectorAll(c.count.selector).length >= c.count.min;
	if (c.js) return !!new Function('doc', c.js)(doc);
	const el = c.selector ? doc.querySelector(c.selector) : null;
	if (!el) return false;
	if (c.style) {
		// getComputedStyle отдаёт «посчитанные» значения: цвета в rgb(), размеры в px
		const cs = doc.defaultView!.getComputedStyle(el);
		if (!Object.entries(c.style).every(([prop, value]) => cs.getPropertyValue(prop).trim() === value)) return false;
	}
	if (c.text && !el.textContent?.includes(c.text)) return false;
	if (c.attr && !el.getAttribute(c.attr)?.trim()) return false;
	return true;
}

// Браузер сам «дозакрывает» теги, поэтому незакрытый тег ищем в исходном тексте:
// открывающих <tag больше, чем закрывающих </tag>. Возвращает имя первого такого тега.
const PAIRED = ['header', 'nav', 'main', 'section', 'footer', 'article', 'div', 'ul', 'ol', 'li', 'p', 'a', 'h1', 'h2', 'h3', 'button', 'form', 'label', 'dialog'];

export function unclosedTag(html: string): string | null {
	const code = html.replace(/<!--[\s\S]*?-->/g, '');
	const count = (re: RegExp) => (code.match(re) || []).length;
	return PAIRED.find((t) => count(new RegExp(`<${t}[\\s>]`, 'gi')) > count(new RegExp(`</${t}\\s*>`, 'gi'))) ?? null;
}

// Возвращает список проверок с результатом. Ошибка внутри правила = проверка не прошла.
export function runChecks(doc: Document, checks: Check[]) {
	return checks.map((c) => {
		let ok = false;
		try {
			ok = pass(doc, c);
		} catch (e) {
			// Недописанный код ученика часто роняет правило — это просто «не прошло».
			// Модератору при локальной разработке (npm run dev) показываем подробности.
			if (import.meta.env.DEV) console.warn('Ошибка в правиле проверки', c, e);
		}
		return { ok, message: c.fail };
	});
}
